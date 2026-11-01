package com.homeservice.auth.service;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.auth.dto.request.RegisterCustomerRequest;
import com.homeservice.auth.dto.response.AccountResponse;
import com.homeservice.auth.dto.response.RegistrationResponse;
import com.homeservice.auth.entity.EmailChallenge;
import com.homeservice.auth.entity.EmailIdentity;
import com.homeservice.auth.enums.EmailChallengePurpose;
import com.homeservice.auth.exception.AuthException;
import com.homeservice.auth.exception.InvalidOtpException;
import com.homeservice.auth.repository.EmailChallengeRepository;
import com.homeservice.auth.repository.EmailIdentityRepository;
import com.homeservice.config.properties.AuthProperties;
import com.homeservice.integration.mail.EmailService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;

@Service
public class CustomerAuthService {
    private final AccountRepository accounts;
    private final EmailIdentityRepository identities;
    private final EmailChallengeRepository challenges;
    private final RefreshTokenService refreshTokens;
    private final PasswordEncoder passwords;
    private final EmailService email;
    private final TokenService tokens;
    private final AuthProperties properties;
    private final Clock clock;
    private final String dummyPasswordHash;

    public CustomerAuthService(AccountRepository accounts, EmailIdentityRepository identities,
                               EmailChallengeRepository challenges, RefreshTokenService refreshTokens,
                               PasswordEncoder passwords, EmailService email, TokenService tokens,
                               AuthProperties properties, Clock clock) {
        this.accounts = accounts;
        this.identities = identities;
        this.challenges = challenges;
        this.refreshTokens = refreshTokens;
        this.passwords = passwords;
        this.email = email;
        this.tokens = tokens;
        this.properties = properties;
        this.clock = clock;
        this.dummyPasswordHash = passwords.encode(tokens.generateRandomValue());
    }

    @Transactional
    public RegistrationResponse register(RegisterCustomerRequest request) {
        validatePasswordLength(request.getPassword());
        // The same account lock serializes re-registration, resend and verification.
        Account account = accounts.findByEmailForUpdate(request.getEmail()).orElse(null);
        EmailChallenge previous = null;
        if (account != null) {
            if (account.getAccountType() != AccountType.CUSTOMER
                    || account.getStatus() != AccountStatus.PENDING_EMAIL) {
                throw emailAlreadyUsed();
            }
            previous = latestChallenge(account);
            requireResendInterval(previous);
        } else {
            // A provider application may reserve an identity before an account exists.
            if (identities.existsById(request.getEmail())) throw emailAlreadyUsed();
            EmailIdentity identity = identities.saveAndFlush(
                    new EmailIdentity(request.getEmail(), AccountType.CUSTOMER));
            account = new Account();
            account.setEmail(identity.getEmail());
            account.setAccountType(AccountType.CUSTOMER);
            account.setEmailIdentity(identity);
            account.setStatus(AccountStatus.PENDING_EMAIL);
        }
        account.setPasswordHash(passwords.encode(request.getPassword()));
        account.setDisplayName(request.getDisplayName());
        account.setPhone(request.getPhone());
        account.setEmailVerifiedAt(null);
        accounts.saveAndFlush(account);
        return issueOtp(account, previous, tokens.generateRandomValue());
    }

    @Transactional
    public RegistrationResponse resendVerification(String emailAddress, String registrationToken) {
        Account account = pendingCustomer(emailAddress);
        EmailChallenge previous = latestChallenge(account);
        if (!matchesRegistrationToken(previous, registrationToken)) throw invalidRegistration();
        requireResendInterval(previous);
        // Resend belongs to the same registration; it must not give another client its token.
        return issueOtp(account, previous, registrationToken);
    }

    @Transactional(noRollbackFor = InvalidOtpException.class)
    public AccountResponse verifyEmail(String emailAddress, String code, String registrationToken) {
        // Serializes verify/resend for the same account, including concurrent wrong guesses.
        Account account = pendingCustomer(emailAddress);
        EmailChallenge challenge = latestChallenge(account);
        Instant now = clock.instant();
        if (challenge == null || !challenge.getEmail().equals(account.getEmail())
                || challenge.getSentAt() == null || challenge.getConsumedAt() != null
                || !challenge.getExpiresAt().isAfter(now)) {
            throw new InvalidOtpException(false);
        }
        // A correct OTP from a newer registration must not activate credentials in an older form.
        // Check before counting guesses so stale/foreign tokens cannot exhaust the current OTP.
        if (!matchesRegistrationToken(challenge, registrationToken)) throw invalidRegistration();
        if (challenge.getAttemptCount() >= properties.otpMaxAttempts()) {
            throw new InvalidOtpException(true);
        }
        if (challenge.getInvalidatedAt() != null) {
            throw new InvalidOtpException(false);
        }
        if (!passwords.matches(code, challenge.getCodeHash())) {
            int attempts = challenge.getAttemptCount() + 1;
            challenge.setAttemptCount(attempts);
            boolean exhausted = attempts >= properties.otpMaxAttempts();
            if (exhausted) {
                challenge.setInvalidatedAt(now);
            }
            // This exception commits only this transaction's attempt counter/invalidation.
            throw new InvalidOtpException(exhausted);
        }
        challenge.setConsumedAt(now);
        account.setEmailVerifiedAt(now);
        account.setStatus(AccountStatus.ACTIVE);
        return AccountResponse.from(account);
    }

    @Transactional
    public RefreshTokenService.TokenPair login(String emailAddress, String password, String previousToken) {
        validatePasswordLength(password);
        Account account = accounts.findByEmailForUpdate(emailAddress).orElse(null);
        boolean matches = passwords.matches(password,
                account == null ? dummyPasswordHash : account.getPasswordHash());
        if (account == null || !matches || account.getAccountType() != AccountType.CUSTOMER) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
        }
        if (account.getStatus() == AccountStatus.SUSPENDED) {
            throw new AuthException(HttpStatus.FORBIDDEN, "ACCOUNT_SUSPENDED", "Tài khoản đang bị khóa.");
        }
        if (account.getStatus() != AccountStatus.ACTIVE || account.getEmailVerifiedAt() == null) {
            throw new AuthException(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED", "Vui lòng xác thực email trước khi đăng nhập.");
        }
        if (Boolean.TRUE.equals(account.getMustChangePassword())) {
            throw new AuthException(HttpStatus.FORBIDDEN, "PASSWORD_CHANGE_REQUIRED", "Tài khoản cần đổi mật khẩu.");
        }
        Instant now = clock.instant();
        account.setLastLoginAt(now);
        return refreshTokens.issueOnLogin(account, previousToken);
    }

    @Transactional(readOnly = true)
    public AccountResponse currentAccount(Long accountId) {
        return AccountResponse.from(accounts.findById(accountId).orElseThrow(() ->
                new AuthException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Vui lòng đăng nhập.")));
    }

    private Account pendingCustomer(String emailAddress) {
        Account account = accounts.findByEmailForUpdate(emailAddress).orElseThrow(this::notPending);
        if (account.getAccountType() != AccountType.CUSTOMER || account.getStatus() != AccountStatus.PENDING_EMAIL) {
            throw notPending();
        }
        return account;
    }

    private AuthException notPending() {
        return new AuthException(HttpStatus.BAD_REQUEST, "VERIFICATION_NOT_AVAILABLE",
                "Không có tài khoản khách hàng đang chờ xác thực với email này.");
    }

    private EmailChallenge latestChallenge(Account account) {
        return challenges.findFirstByAccountIdAndPurposeOrderByIdDesc(account.getId(),
                EmailChallengePurpose.REGISTER_CUSTOMER).orElse(null);
    }

    private void requireResendInterval(EmailChallenge previous) {
        if (previous != null && previous.getSentAt() != null
                && clock.instant().isBefore(previous.getSentAt().plus(properties.otpResendInterval()))) {
            throw new AuthException(HttpStatus.TOO_MANY_REQUESTS, "OTP_RESEND_TOO_SOON",
                    "Vui lòng chờ trước khi yêu cầu mã xác thực mới.");
        }
    }

    private boolean matchesRegistrationToken(EmailChallenge challenge, String rawToken) {
        if (challenge == null || challenge.getRegistrationTokenHash() == null
                || rawToken == null || rawToken.length() != 43) return false;
        return MessageDigest.isEqual(
                challenge.getRegistrationTokenHash().getBytes(StandardCharsets.US_ASCII),
                tokens.hashToken(rawToken).getBytes(StandardCharsets.US_ASCII));
    }

    private AuthException invalidRegistration() {
        return new AuthException(HttpStatus.BAD_REQUEST, "REGISTRATION_INVALID",
                "Lần đăng ký không còn hợp lệ. Vui lòng đăng ký lại.");
    }

    private AuthException emailAlreadyUsed() {
        return new AuthException(HttpStatus.CONFLICT, "EMAIL_ALREADY_USED", "Email đã được đăng ký.");
    }

    private RegistrationResponse issueOtp(Account account, EmailChallenge previous, String registrationToken) {
        String code;
        do {
            code = tokens.generateOtp();
        } while (previous != null && passwords.matches(code, previous.getCodeHash()));
        EmailChallenge challenge = new EmailChallenge();
        challenge.setEmail(account.getEmail());
        challenge.setAccount(account);
        challenge.setPurpose(EmailChallengePurpose.REGISTER_CUSTOMER);
        challenge.setCodeHash(passwords.encode(code));
        challenge.setRegistrationTokenHash(tokens.hashToken(registrationToken));
        // Sending is synchronous; a delivery failure rolls back the account/challenge changes.
        email.sendVerificationEmail(account.getEmail(), code);
        Instant sentAt = clock.instant();
        if (previous != null && previous.getConsumedAt() == null && previous.getInvalidatedAt() == null) {
            previous.setInvalidatedAt(sentAt);
        }
        challenge.setSentAt(sentAt);
        challenge.setExpiresAt(sentAt.plus(properties.otpTtl()));
        challenges.save(challenge);
        return new RegistrationResponse(account.getEmail(), registrationToken, challenge.getExpiresAt(),
                sentAt.plus(properties.otpResendInterval()));
    }

    private void validatePasswordLength(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "PASSWORD_TOO_LONG", "Mật khẩu được phép tối đa 72 byte UTF-8.");
        }
    }

}
