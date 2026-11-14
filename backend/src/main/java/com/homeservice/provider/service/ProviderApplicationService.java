package com.homeservice.provider.service;

import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.auth.entity.EmailChallenge;
import com.homeservice.auth.entity.EmailIdentity;
import com.homeservice.auth.enums.EmailChallengePurpose;
import com.homeservice.auth.exception.AuthException;
import com.homeservice.auth.exception.InvalidOtpException;
import com.homeservice.auth.repository.EmailChallengeRepository;
import com.homeservice.auth.repository.EmailIdentityRepository;
import com.homeservice.auth.service.TokenService;
import com.homeservice.auth.service.PendingRegistrationCleanup;
import com.homeservice.auth.service.PendingRegistrationPolicy;
import com.homeservice.config.properties.AuthProperties;
import com.homeservice.integration.mail.EmailService;
import com.homeservice.provider.dto.request.SubmitProviderApplicationRequest;
import com.homeservice.provider.dto.response.ProviderApplicationResponse;
import com.homeservice.provider.entity.ProviderApplication;
import com.homeservice.provider.enums.ProviderApplicationStatus;
import com.homeservice.provider.repository.ProviderApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class ProviderApplicationService {
    private final ProviderApplicationRepository applications;
    private final EmailIdentityRepository identities;
    private final AccountRepository accounts;
    private final EmailChallengeRepository challenges;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final EmailService mail;
    private final AuthProperties properties;
    private final Clock clock;
    private final PendingRegistrationCleanup cleanup;
    private final PendingRegistrationPolicy pendingPolicy;

    @Transactional
    public ProviderApplicationResponse submit(SubmitProviderApplicationRequest request) {
        cleanup.cleanupLocked(request.getEmail());
        lockIdentity(request.getEmail(), true);
        ProviderApplication application = applications.findFirstByEmailOrderByIdDesc(request.getEmail()).orElse(null);
        EmailChallenge previous = null;
        if (application == null || application.getStatus() == ProviderApplicationStatus.REJECTED) {
            // Preserve rejected submissions; a new submission has its own OTP history.
            application = new ProviderApplication();
            application.setCreatedAt(clock.instant());
            application.setEmail(request.getEmail());
        } else if (application.getStatus() == ProviderApplicationStatus.PENDING_EMAIL) {
            previous = latestChallenge(application);
            requireResendInterval(previous);
        } else {
            throw new AuthException(HttpStatus.CONFLICT, "APPLICATION_ALREADY_EXISTS",
                    "Email đã có hồ sơ đang được xử lý hoặc đã được duyệt.");
        }
        application.setApplicantName(request.getApplicantName());
        application.setPhone(request.getPhone());
        application.setBusinessName(request.getBusinessName());
        application.setCity(request.getCity());
        application.setDescription(request.getDescription());
        application.setDocumentUrl(request.getDocumentUrl());
        application.setStatus(ProviderApplicationStatus.PENDING_EMAIL);
        application.setEmailVerifiedAt(null);
        applications.saveAndFlush(application);
        return issueOtp(application, previous, tokens.generateRandomValue());
    }

    @Transactional
    public ProviderApplicationResponse resend(String email, String registrationToken) {
        ProviderApplication application = pendingApplication(email);
        EmailChallenge previous = latestChallenge(application);
        requireRegistrationToken(previous, registrationToken);
        requireResendInterval(previous);
        return issueOtp(application, previous, registrationToken);
    }

    @Transactional(noRollbackFor = InvalidOtpException.class)
    public ProviderApplicationResponse verify(String email, String code, String registrationToken) {
        ProviderApplication application = pendingApplication(email);
        EmailChallenge challenge = latestChallenge(application);
        // Do not disclose a submission's details or spend its OTP quota without the current token.
        requireRegistrationToken(challenge, registrationToken);
        Instant now = clock.instant();
        if (!challenge.getEmail().equals(application.getEmail()) || challenge.getSentAt() == null
                || challenge.getConsumedAt() != null || !challenge.getExpiresAt().isAfter(now)) {
            throw new InvalidOtpException(false);
        }
        if (challenge.getAttemptCount() >= properties.otpMaxAttempts()) throw new InvalidOtpException(true);
        if (challenge.getInvalidatedAt() != null) throw new InvalidOtpException(false);
        if (!passwords.matches(code, challenge.getCodeHash())) {
            int attempts = challenge.getAttemptCount() + 1;
            challenge.setAttemptCount(attempts);
            boolean exhausted = attempts >= properties.otpMaxAttempts();
            if (exhausted) challenge.setInvalidatedAt(now);
            throw new InvalidOtpException(exhausted);
        }
        challenge.setConsumedAt(now);
        application.setEmailVerifiedAt(now);
        application.setStatus(ProviderApplicationStatus.PENDING_REVIEW);
        return new ProviderApplicationResponse(email, application.getStatus(), null, null, null);
    }

    private void lockIdentity(String email, boolean createIfMissing) {
        // All provider submission operations use this lock, including across backend instances.
        EmailIdentity identity = createIfMissing ? cleanup.reserve(email, AccountType.PROVIDER)
                : identities.findByEmailForUpdate(email).orElse(null);
        if (identity == null || identity.getAccountType() != AccountType.PROVIDER
                || accounts.findByEmailForUpdate(email).isPresent()) {
            if (!createIfMissing) throw invalidRegistration();
            throw new AuthException(HttpStatus.CONFLICT, "EMAIL_ALREADY_USED", "Email đã được đăng ký.");
        }
    }

    private ProviderApplication pendingApplication(String email) {
        lockIdentity(email, false);
        var all = applications.findAllByEmailForUpdate(email);
        ProviderApplication application = all.isEmpty() ? null : all.getLast();
        if (application == null || application.getStatus() != ProviderApplicationStatus.PENDING_EMAIL
                || pendingPolicy.expired(application.getCreatedAt())) throw invalidRegistration();
        return application;
    }

    private EmailChallenge latestChallenge(ProviderApplication application) {
        return challenges.findFirstByProviderApplicationIdAndPurposeOrderByIdDesc(application.getId(),
                EmailChallengePurpose.VERIFY_PROVIDER_APPLICATION).orElse(null);
    }

    private void requireRegistrationToken(EmailChallenge challenge, String rawToken) {
        if (challenge == null || challenge.getRegistrationTokenHash() == null
                || rawToken == null || rawToken.length() != 43
                || !MessageDigest.isEqual(challenge.getRegistrationTokenHash().getBytes(StandardCharsets.US_ASCII),
                tokens.hashToken(rawToken).getBytes(StandardCharsets.US_ASCII))) {
            throw invalidRegistration();
        }
    }

    private void requireResendInterval(EmailChallenge previous) {
        if (previous != null && previous.getSentAt() != null
                && clock.instant().isBefore(previous.getSentAt().plus(properties.otpResendInterval()))) {
            throw new AuthException(HttpStatus.TOO_MANY_REQUESTS, "OTP_RESEND_TOO_SOON",
                    "Vui lòng chờ trước khi yêu cầu mã xác thực mới.");
        }
    }

    private ProviderApplicationResponse issueOtp(ProviderApplication application, EmailChallenge previous, String token) {
        String code;
        do {
            code = tokens.generateOtp();
        } while (previous != null && passwords.matches(code, previous.getCodeHash()));
        EmailChallenge challenge = new EmailChallenge();
        challenge.setEmail(application.getEmail());
        challenge.setProviderApplication(application);
        challenge.setPurpose(EmailChallengePurpose.VERIFY_PROVIDER_APPLICATION);
        challenge.setCodeHash(passwords.encode(code));
        challenge.setRegistrationTokenHash(tokens.hashToken(token));
        mail.sendProviderApplicationVerificationEmail(application.getEmail(), code);
        Instant sentAt = clock.instant();
        if (previous != null && previous.getConsumedAt() == null && previous.getInvalidatedAt() == null) {
            previous.setInvalidatedAt(sentAt);
        }
        challenge.setSentAt(sentAt);
        challenge.setExpiresAt(pendingPolicy.otpExpiry(sentAt, application.getCreatedAt()));
        challenges.save(challenge);
        return new ProviderApplicationResponse(application.getEmail(), application.getStatus(), token,
                challenge.getExpiresAt(), sentAt.plus(properties.otpResendInterval()));
    }

    private AuthException invalidRegistration() {
        return new AuthException(HttpStatus.BAD_REQUEST, "REGISTRATION_INVALID",
                "Lần nộp hồ sơ không còn hợp lệ. Vui lòng nộp hồ sơ lại.");
    }
}
