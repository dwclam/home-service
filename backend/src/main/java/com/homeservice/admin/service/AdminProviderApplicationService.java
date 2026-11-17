package com.homeservice.admin.service;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.admin.dto.response.ProviderApplicationDecisionResponse;
import com.homeservice.admin.dto.response.ProviderApplicationDetailResponse;
import com.homeservice.admin.dto.response.ProviderApplicationSummaryResponse;
import com.homeservice.audit.service.AdminAuditLogService;
import com.homeservice.auth.entity.EmailIdentity;
import com.homeservice.auth.exception.AuthException;
import com.homeservice.auth.repository.EmailIdentityRepository;
import com.homeservice.auth.repository.RefreshTokenRepository;
import com.homeservice.auth.service.TokenService;
import com.homeservice.common.dto.PageResponse;
import com.homeservice.common.exception.DataConflictException;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.integration.mail.EmailService;
import com.homeservice.provider.entity.ProviderApplication;
import com.homeservice.provider.entity.ProviderProfile;
import com.homeservice.provider.enums.CredentialsEmailStatus;
import com.homeservice.provider.enums.ProviderApplicationStatus;
import com.homeservice.provider.repository.ProviderApplicationRepository;
import com.homeservice.provider.repository.ProviderProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.TransactionException;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.function.BiConsumer;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminProviderApplicationService {
    private final AccountRepository accounts;
    private final ProviderApplicationRepository applications;
    private final EmailIdentityRepository identities;
    private final ProviderProfileRepository profiles;
    private final RefreshTokenRepository refreshTokens;
    private final AdminAuditLogService audit;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final EmailService mail;
    private final Clock clock;
    private final TransactionTemplate transactions;

    @Transactional(readOnly = true)
    public PageResponse<ProviderApplicationSummaryResponse> list(Long adminId, String status, int page, int size) {
        requireActiveAdmin(adminId);
        if (page < 0 || size < 1 || size > 100) {
            throw invalidInput("page phải từ 0; size phải từ 1 đến 100.");
        }
        // JPA applies offsets as int; reject an overflowing offset instead of returning an internal error.
        if ((long) page * size > Integer.MAX_VALUE) {
            throw invalidInput("Trang yêu cầu vượt giới hạn phân trang được hỗ trợ.");
        }
        ProviderApplicationStatus requestedStatus = ProviderApplicationStatus.PENDING_REVIEW;
        if (status != null) {
            try { requestedStatus = ProviderApplicationStatus.valueOf(status); }
            catch (IllegalArgumentException ex) { throw invalidInput("Trạng thái hồ sơ không hợp lệ."); }
        }
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        var result = applications.findByStatus(requestedStatus, pageable);
        var items = result.getContent().stream().map(ProviderApplicationSummaryResponse::from).toList();
        return new PageResponse<>(items, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public ProviderApplicationDetailResponse detail(Long adminId, Long id) {
        requireActiveAdmin(adminId);
        requireValidApplicationId(id);
        var application = applications.findById(id)
                .orElseThrow(this::applicationNotFound);
        // Map within the read transaction; no entity or lazy account association is serialized.
        return ProviderApplicationDetailResponse.from(application);
    }

    @Transactional(propagation = Propagation.NEVER)
    public ProviderApplicationDecisionResponse approve(Long adminId, Long id) {
        var issuance = transactions.execute(transaction -> approveInTransaction(adminId, id));
        return issuance.temporaryPassword == null ? issuance.decision
                : deliverCredentials(issuance, mail::sendProviderApprovedEmail);
    }

    @Transactional(propagation = Propagation.NEVER)
    public ProviderApplicationDecisionResponse reissueCredentials(Long adminId, Long id) {
        var issuance = transactions.execute(transaction -> reissueInTransaction(adminId, id));
        return deliverCredentials(issuance, mail::sendProviderCredentialsReissuedEmail);
    }

    @Transactional
    public ProviderApplicationDecisionResponse reject(Long adminId, Long id, String reason) {
        var admin = requireActiveAdmin(adminId);
        var locked = lockApplication(id);
        var application = locked.application();
        var previousStatus = application.getStatus();
        if (previousStatus == ProviderApplicationStatus.REJECTED) {
            return ProviderApplicationDecisionResponse.from(application, null);
        }
        requirePendingReview(application, "Hồ sơ chưa đủ điều kiện để từ chối.");
        requireProviderIdentity(locked.identity());
        if (locked.account() != null || profiles.findByApplicationId(id).isPresent()) {
            throw applicationConflict();
        }

        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        application.setStatus(ProviderApplicationStatus.REJECTED);
        application.setDecidedByAdmin(admin);
        application.setDecidedAt(now);
        application.setRejectionReason(reason);
        application.setCredentialsEmailStatus(null);
        audit.record(admin, "PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION", id.toString(), reason,
                Map.of("before", Map.of("status", previousStatus.name()),
                        "after", Map.of("status", application.getStatus().name())), now);

        // Check database writes before sending. A delivery error still rolls back the rejection and audit.
        applications.flush();
        mail.sendProviderRejectedEmail(application.getEmail(), reason);
        return ProviderApplicationDecisionResponse.from(application, null);
    }

    private CredentialsIssuance approveInTransaction(Long adminId, Long id) {
        var admin = requireActiveAdmin(adminId);
        var locked = lockApplication(id);
        var application = locked.application();
        var account = locked.account();

        var previousStatus = application.getStatus();
        boolean alreadyApproved = previousStatus == ProviderApplicationStatus.APPROVED;
        if (!alreadyApproved) {
            requirePendingReview(application, "Hồ sơ chưa đủ điều kiện để duyệt.");
        }
        requireProviderIdentity(locked.identity());

        if (alreadyApproved) {
            var provider = requireLinkedProvider(locked);
            return new CredentialsIssuance(ProviderApplicationDecisionResponse.from(application, provider.getId()),
                    null, null, null);
        }
        if (account != null || profiles.findByApplicationId(id).isPresent()) {
            throw applicationConflict();
        }

        String temporaryPassword = tokens.generateRandomValue();
        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        var provider = createProviderAccount(application, locked.identity(), temporaryPassword, now);
        createProviderProfile(application, provider, now);
        application.setStatus(ProviderApplicationStatus.APPROVED);
        application.setDecidedByAdmin(admin);
        application.setDecidedAt(now);
        application.setRejectionReason(null);
        application.setCredentialsEmailStatus(CredentialsEmailStatus.UNCONFIRMED);
        audit.record(admin, "PROVIDER_APPLICATION_APPROVED", "PROVIDER_APPLICATION", id.toString(), null,
                Map.of("before", Map.of("status", previousStatus.name()),
                        "after", Map.of("status", application.getStatus().name(), "providerAccountId", provider.getId())),
                now);

        return new CredentialsIssuance(ProviderApplicationDecisionResponse.from(application, provider.getId()),
                application.getEmail(), temporaryPassword, provider.getPasswordHash());
    }

    private CredentialsIssuance reissueInTransaction(Long adminId, Long id) {
        var admin = requireActiveAdmin(adminId);
        var locked = lockApplication(id);
        var application = locked.application();
        var previousEmailStatus = application.getCredentialsEmailStatus();
        if (application.getStatus() != ProviderApplicationStatus.APPROVED
                || (previousEmailStatus != CredentialsEmailStatus.FAILED
                && previousEmailStatus != CredentialsEmailStatus.UNCONFIRMED)) {
            throw reissueNotAllowed();
        }

        requireProviderIdentity(locked.identity());
        var provider = requireLinkedProvider(locked);
        if (provider.getStatus() != AccountStatus.ACTIVE || provider.getEmailVerifiedAt() == null
                || !Boolean.TRUE.equals(provider.getMustChangePassword())) {
            throw reissueNotAllowed();
        }

        String temporaryPassword = tokens.generateRandomValue();
        String passwordHash = passwords.encode(temporaryPassword);
        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        provider.setPasswordHash(passwordHash);
        application.setCredentialsEmailStatus(CredentialsEmailStatus.UNCONFIRMED);
        refreshTokens.revokeByAccountId(provider.getId(), now);
        audit.record(admin, "PROVIDER_CREDENTIALS_REISSUED", "PROVIDER_APPLICATION", id.toString(), null,
                Map.of("providerAccountId", provider.getId(), "previousCredentialsEmailStatus", previousEmailStatus.name()),
                now);

        return new CredentialsIssuance(ProviderApplicationDecisionResponse.from(application, provider.getId()),
                application.getEmail(), temporaryPassword, passwordHash);
    }

    private LockedApplication lockApplication(Long id) {
        requireValidApplicationId(id);
        // Only read the email before locking so JPA loads the current application state under the lock.
        String email = applications.findEmailById(id).orElseThrow(this::applicationNotFound);
        var identity = identities.findByEmailForUpdate(email).orElse(null);
        var account = accounts.findByEmailForUpdate(email).orElse(null);
        var application = applications.findAllByEmailForUpdate(email).stream()
                .filter(candidate -> id.equals(candidate.getId()))
                .findFirst().orElseThrow(this::applicationNotFound);
        return new LockedApplication(identity, account, application);
    }

    private void requirePendingReview(ProviderApplication application, String message) {
        if (application.getStatus() != ProviderApplicationStatus.PENDING_REVIEW
                || application.getEmailVerifiedAt() == null) {
            throw new AuthException(HttpStatus.CONFLICT, "APPLICATION_NOT_REVIEWABLE", message);
        }
    }

    private void requireProviderIdentity(EmailIdentity identity) {
        if (identity == null || identity.getAccountType() != AccountType.PROVIDER) {
            throw applicationConflict();
        }
    }

    private Account requireLinkedProvider(LockedApplication locked) {
        var application = locked.application();
        var provider = locked.account();
        var profile = profiles.findByApplicationId(application.getId()).orElse(null);
        if (provider == null || provider.getAccountType() != AccountType.PROVIDER || profile == null
                || !provider.getId().equals(profile.getAccountId())
                || application.getDecidedAt() == null || application.getDecidedByAdmin() == null) {
            throw applicationConflict();
        }
        return provider;
    }

    private Account createProviderAccount(ProviderApplication application, EmailIdentity identity,
                                          String temporaryPassword, Instant now) {
        var provider = new Account();
        provider.setEmail(application.getEmail());
        provider.setEmailIdentity(identity);
        provider.setAccountType(AccountType.PROVIDER);
        provider.setPasswordHash(passwords.encode(temporaryPassword));
        provider.setDisplayName(application.getApplicantName());
        provider.setPhone(application.getPhone());
        provider.setStatus(AccountStatus.ACTIVE);
        provider.setEmailVerifiedAt(application.getEmailVerifiedAt());
        provider.setMustChangePassword(true);
        provider.setCreatedAt(now);
        provider.setUpdatedAt(now);
        return accounts.save(provider);
    }

    private void createProviderProfile(ProviderApplication application, Account provider, Instant now) {
        var profile = new ProviderProfile();
        profile.setAccount(provider);
        profile.setApplication(application);
        profile.setBusinessName(application.getBusinessName());
        profile.setCity(application.getCity());
        profile.setBio(application.getDescription());
        profile.setCreatedAt(now);
        profile.setUpdatedAt(now);
        profiles.save(profile);
    }

    private ProviderApplicationDecisionResponse deliverCredentials(CredentialsIssuance issuance,
                                                                  BiConsumer<String, String> sendEmail) {
        // The password and the audit entry have committed before sending.
        var emailStatus = sendCredentials(issuance, sendEmail);
        try {
            var currentStatus = transactions.execute(transaction -> saveEmailResult(issuance, emailStatus));
            issuance.decision.setCredentialsEmailStatus(currentStatus);
        } catch (DataAccessException | TransactionException exception) {
            log.warn("Could not save credentials email status for provider application {}", issuance.decision.getId());
        }
        return issuance.decision;
    }

    private CredentialsEmailStatus saveEmailResult(CredentialsIssuance issuance, CredentialsEmailStatus status) {
        Long id = issuance.decision.getId();
        // Reissues also lock the account before the application. Hold the account lock through the update.
        var provider = accounts.findByIdForUpdate(issuance.decision.getProviderAccountId()).orElse(null);
        if (provider != null && issuance.passwordHash.equals(provider.getPasswordHash())
                && Boolean.TRUE.equals(provider.getMustChangePassword())
                && applications.updateCredentialsEmailStatus(id, status, clock.instant()) == 1) {
            return status;
        }
        return applications.findById(id).map(ProviderApplication::getCredentialsEmailStatus)
                .orElse(CredentialsEmailStatus.UNCONFIRMED);
    }

    private CredentialsEmailStatus sendCredentials(CredentialsIssuance issuance, BiConsumer<String, String> sendEmail) {
        try {
            sendEmail.accept(issuance.email, issuance.temporaryPassword);
            return CredentialsEmailStatus.SENT;
        } catch (AuthException exception) {
            if (!"EMAIL_DELIVERY_FAILED".equals(exception.getCode())) {
                throw exception;
            }
            log.warn("Could not send credentials email for provider application {}", issuance.decision.getId());
            return CredentialsEmailStatus.FAILED;
        }
    }

    private Account requireActiveAdmin(Long adminId) {
        if (adminId == null) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Vui lòng đăng nhập.");
        }
        var admin = accounts.findById(adminId).orElseThrow(this::accessDenied);
        // A still-valid JWT must not authorize an admin that has since been suspended or lost eligibility.
        if (admin.getAccountType() != AccountType.ADMIN || admin.getStatus() != AccountStatus.ACTIVE
                || admin.getEmailVerifiedAt() == null || Boolean.TRUE.equals(admin.getMustChangePassword())) {
            throw accessDenied();
        }
        return admin;
    }

    private void requireValidApplicationId(Long id) {
        if (id == null || id <= 0) throw invalidInput("ID hồ sơ phải là số nguyên dương.");
    }

    private ResourceNotFoundException applicationNotFound() {
        return new ResourceNotFoundException("Không tìm thấy hồ sơ nhà cung cấp.");
    }

    private DataConflictException applicationConflict() {
        return new DataConflictException("Dữ liệu hồ sơ và tài khoản nhà cung cấp không nhất quán.");
    }

    private AuthException reissueNotAllowed() {
        return new AuthException(HttpStatus.CONFLICT, "CREDENTIAL_REISSUE_NOT_ALLOWED",
                "Hồ sơ chưa đủ điều kiện để cấp lại mật khẩu tạm.");
    }

    private AuthException accessDenied() {
        return new AuthException(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Tài khoản không còn quyền quản trị hợp lệ.");
    }

    private AuthException invalidInput(String message) {
        return new AuthException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
    }

    private record LockedApplication(EmailIdentity identity, Account account, ProviderApplication application) {
    }

    @RequiredArgsConstructor
    private static final class CredentialsIssuance {
        private final ProviderApplicationDecisionResponse decision;
        private final String email;
        private final String temporaryPassword;
        private final String passwordHash;
    }
}
