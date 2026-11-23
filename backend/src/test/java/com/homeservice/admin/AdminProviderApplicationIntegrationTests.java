package com.homeservice.admin;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.auth.entity.EmailIdentity;
import com.homeservice.auth.entity.RefreshToken;
import com.homeservice.auth.repository.EmailIdentityRepository;
import com.homeservice.auth.repository.RefreshTokenRepository;
import com.homeservice.auth.service.JwtTokenService;
import com.homeservice.auth.service.TokenService;
import com.homeservice.provider.entity.ProviderApplication;
import com.homeservice.provider.enums.ProviderApplicationStatus;
import com.homeservice.provider.repository.ProviderApplicationRepository;
import com.homeservice.provider.repository.ProviderProfileRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;

import static com.homeservice.provider.enums.CredentialsEmailStatus.FAILED;
import static com.homeservice.provider.enums.CredentialsEmailStatus.SENT;
import static com.homeservice.provider.enums.CredentialsEmailStatus.UNCONFIRMED;
import static com.homeservice.provider.enums.ProviderApplicationStatus.APPROVED;
import static com.homeservice.provider.enums.ProviderApplicationStatus.PENDING_EMAIL;
import static com.homeservice.provider.enums.ProviderApplicationStatus.PENDING_REVIEW;
import static com.homeservice.provider.enums.ProviderApplicationStatus.REJECTED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:nestify-admin-application-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=15000")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminProviderApplicationIntegrationTests {
    private static final String ROOT = "/api/admin/provider-applications";
    private static final String PUBLIC_ROOT = "/api/provider-applications";
    private static final String EMAIL = "provider@example.test";
    private static final String REASON = "Tài liệu chứng minh năng lực chưa đầy đủ.";
    private static final Instant NOW = Instant.parse("2026-11-13T02:30:00Z");
    private static final Pattern TEMPORARY_PASSWORD = Pattern.compile("(?m)^Mật khẩu tạm: ([A-Za-z0-9_-]{43})$");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired JwtTokenService tokens;
    @Autowired AccountRepository accounts;
    @Autowired EmailIdentityRepository identities;
    @Autowired ProviderApplicationRepository applications;
    @Autowired ProviderProfileRepository profiles;
    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired TokenService randomValues;
    @Autowired PasswordEncoder passwords;
    @Autowired TransactionTemplate transactions;
    @MockitoBean JavaMailSender mail;
    @MockitoBean Clock clock;

    private Account admin;
    private String adminJwt;

    @BeforeEach
    void setUp() {
        jdbc.update("delete from admin_audit_logs");
        profiles.deleteAllInBatch();
        jdbc.update("delete from email_challenges");
        applications.deleteAllInBatch();
        refreshTokens.deleteAllInBatch();
        accounts.deleteAllInBatch();
        identities.deleteAllInBatch();
        when(clock.instant()).thenReturn(NOW);
        admin = createAccount("admin@example.test", AccountType.ADMIN);
        adminJwt = tokens.issueAccess(admin).getTokenValue();
    }

    @Test
    void rejectsOnceWithTrimmedReasonAndPreservesDecisionOnRepeat() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        var otherAdmin = createAccount("other-admin@example.test", AccountType.ADMIN);
        var original = reject(application.getId(), adminJwt,
                Map.of("reason", "  " + REASON + "\t", "adminId", otherAdmin.getId(), "email", "other@example.test"));
        assertThat(original.getResponse().getStatus()).isEqualTo(200);
        assertThat(original.getResponse().getHeader(HttpHeaders.CACHE_CONTROL)).isEqualTo("no-store");
        var decision = body(original);
        assertThat(decision.get("id").asLong()).isEqualTo(application.getId());
        assertThat(decision.get("status").asString()).isEqualTo("REJECTED");
        assertThat(decision.get("rejectionReason").asString()).isEqualTo(REASON);
        assertThat(decision.get("decidedByAdminId").asLong()).isEqualTo(admin.getId());
        assertThat(decision.get("decidedAt").asString()).isEqualTo(NOW.toString());
        assertThat(decision.get("providerAccountId").isNull()).isTrue();
        assertThat(decision.get("credentialsEmailStatus").isNull()).isTrue();

        var repeat = reject(application.getId(), tokens.issueAccess(otherAdmin).getTokenValue(),
                Map.of("reason", "Lý do khác"));
        assertThat(repeat.getResponse().getStatus()).isEqualTo(200);
        assertThat(body(repeat)).isEqualTo(decision);
        var saved = applications.findById(application.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(REJECTED);
        assertThat(saved.getEmailVerifiedAt()).isEqualTo(NOW);
        assertThat(accounts.findByEmail(EMAIL)).isEmpty();
        assertThat(profiles.findByApplicationId(application.getId())).isEmpty();
        assertThat(identities.findById(EMAIL)).isPresent();

        var audit = jdbc.queryForMap("select admin_id, action, entity_type, reason, changes from admin_audit_logs where entity_id = ?",
                application.getId().toString());
        assertThat(audit).containsEntry("ADMIN_ID", admin.getId())
                .containsEntry("ACTION", "PROVIDER_APPLICATION_REJECTED")
                .containsEntry("ENTITY_TYPE", "PROVIDER_APPLICATION").containsEntry("REASON", REASON);
        var changes = json.readTree((byte[]) audit.get("CHANGES"));
        assertThat(changes.path("before").path("status").asString()).isEqualTo("PENDING_REVIEW");
        assertThat(changes.path("after").path("status").asString()).isEqualTo("REJECTED");

        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(message.capture());
        assertThat(message.getValue().getTo()).containsExactly(EMAIL);
        assertThat(message.getValue().getText()).contains(REASON, "nộp hồ sơ mới");
        verifyNoMoreInteractions(mail);
        mvc.perform(get(ROOT + "/{id}", application.getId()).header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwt))
                .andExpect(status().isOk()).andExpect(jsonPath("$.rejectionReason").value(REASON));
    }

    @Test
    void smtpFailureRollsBackAndAdminCanRetry() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        doThrow(new MailSendException("Internal SMTP failure")).when(mail).send(any(SimpleMailMessage.class));
        assertError(reject(application.getId(), adminJwt, Map.of("reason", REASON)), 503, "EMAIL_DELIVERY_FAILED");

        var saved = applications.findById(application.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(PENDING_REVIEW);
        assertThat(saved.getDecidedByAdmin()).isNull();
        assertThat(saved.getDecidedAt()).isNull();
        assertThat(saved.getRejectionReason()).isNull();
        assertThat(auditCount()).isZero();

        reset(mail);
        assertThat(reject(application.getId(), adminJwt, Map.of("reason", REASON)).getResponse().getStatus())
                .isEqualTo(200);
        assertThat(auditCount()).isEqualTo(1);
        verify(mail).send(any(SimpleMailMessage.class));
    }

    @Test
    void databaseWriteFailureStopsBeforeSmtp() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        jdbc.execute("alter table provider_applications add constraint test_reject_write check (status <> 'REJECTED')");
        try {
            assertError(reject(application.getId(), adminJwt, Map.of("reason", REASON)), 409, "DATA_CONFLICT");
            assertThat(applications.findById(application.getId()).orElseThrow().getStatus()).isEqualTo(PENDING_REVIEW);
            assertThat(auditCount()).isZero();
            verifyNoInteractions(mail);
        } finally {
            jdbc.execute("alter table provider_applications drop constraint test_reject_write");
        }
    }

    @Test
    void rejectsInvalidReasonAndIneligibleApplication() throws Exception {
        var unverified = createApplication(PENDING_EMAIL, null);
        assertError(reject(unverified.getId(), adminJwt, Map.of()), 400, "VALIDATION_ERROR");
        assertError(reject(unverified.getId(), adminJwt, Map.of("reason", " \t\n ")), 400, "VALIDATION_ERROR");
        assertError(reject(unverified.getId(), adminJwt, Map.of("reason", "x".repeat(2001))), 400, "VALIDATION_ERROR");
        assertError(reject(unverified.getId(), adminJwt, Map.of("reason", REASON)), 409, "APPLICATION_NOT_REVIEWABLE");
        assertError(reject(0L, adminJwt, Map.of("reason", REASON)), 400, "VALIDATION_ERROR");
        assertError(reject(unverified.getId() + 1, adminJwt, Map.of("reason", REASON)), 404, "NOT_FOUND");
        assertThat(auditCount()).isZero();
        verifyNoInteractions(mail);

        unverified.setStatus(PENDING_REVIEW);
        unverified.setEmailVerifiedAt(NOW);
        applications.saveAndFlush(unverified);
        var maxReason = "x".repeat(2000);
        var result = reject(unverified.getId(), adminJwt, Map.of("reason", " " + maxReason + " "));
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        assertThat(body(result).get("rejectionReason").asString()).isEqualTo(maxReason);
    }

    @Test
    void requiresCsrfAndAnEligibleAdmin() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        var payload = Map.of("reason", REASON);
        mvc.perform(post(ROOT + "/{id}/reject", application.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload)))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CSRF_INVALID"));
        assertError(reject(application.getId(), null, payload), 401, "AUTHENTICATION_REQUIRED");
        var customer = createAccount("customer@example.test", AccountType.CUSTOMER);
        assertError(reject(application.getId(), tokens.issueAccess(customer).getTokenValue(), payload), 403, "ACCESS_DENIED");

        admin.setStatus(AccountStatus.SUSPENDED);
        admin.setSuspendedAt(NOW);
        admin.setSuspensionReason("Tài khoản test bị khóa");
        accounts.saveAndFlush(admin);
        assertError(reject(application.getId(), adminJwt, payload), 403, "ACCESS_DENIED");
        assertThat(applications.findById(application.getId()).orElseThrow().getStatus()).isEqualTo(PENDING_REVIEW);
        assertThat(auditCount()).isZero();
        verifyNoInteractions(mail);
    }

    @Test
    void approvalWaitsForRejectionAndReturnsConflict() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        var otherAdminJwt = tokens.issueAccess(createAccount("other-admin@example.test", AccountType.ADMIN)).getTokenValue();
        var mailStarted = new CountDownLatch(1);
        var finishMail = new CountDownLatch(1);
        doAnswer(call -> {
            mailStarted.countDown();
            if (!finishMail.await(10, TimeUnit.SECONDS)) {
                throw new AssertionError("Expected the concurrent approval to reach the identity lock");
            }
            return null;
        }).when(mail).send(any(SimpleMailMessage.class));

        try (var pool = Executors.newFixedThreadPool(2)) {
            var rejection = pool.submit(() -> reject(application.getId(), adminJwt, Map.of("reason", REASON)));
            try {
                assertThat(mailStarted.await(5, TimeUnit.SECONDS)).isTrue();
                var approval = pool.submit(() -> postJson(ROOT + "/" + application.getId() + "/approve", otherAdminJwt, null));
                await().atMost(Duration.ofSeconds(5)).until(() -> jdbc.queryForObject("""
                        select count(*) from information_schema.sessions
                        where blocker_id is not null and lower(executing_statement) like '%email_identities%'
                        """, Long.class) == 1);
                finishMail.countDown();
                assertThat(rejection.get(5, TimeUnit.SECONDS).getResponse().getStatus()).isEqualTo(200);
                assertError(approval.get(5, TimeUnit.SECONDS), 409, "APPLICATION_NOT_REVIEWABLE");
            } finally {
                finishMail.countDown();
            }
        }
        assertThat(applications.findById(application.getId()).orElseThrow().getStatus()).isEqualTo(REJECTED);
        assertThat(accounts.findByEmail(EMAIL)).isEmpty();
        assertThat(auditCount()).isEqualTo(1);
        verify(mail).send(any(SimpleMailMessage.class));
    }

    @Test
    void approvedApplicationCannotBeRejected() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        var approved = postJson(ROOT + "/" + application.getId() + "/approve", adminJwt, null);
        assertThat(approved.getResponse().getStatus()).isEqualTo(200);
        assertThat(body(approved).get("credentialsEmailStatus").asString()).isEqualTo("SENT");
        assertError(reject(application.getId(), adminJwt, Map.of("reason", REASON)), 409, "APPLICATION_NOT_REVIEWABLE");
        assertThat(applications.findById(application.getId()).orElseThrow().getStatus()).isEqualTo(ProviderApplicationStatus.APPROVED);
        assertThat(auditCount()).isEqualTo(1);
        verify(mail).send(any(SimpleMailMessage.class));
    }

    @Test
    void applicantCanSubmitWithSameEmailAfterRejection() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        assertThat(reject(application.getId(), adminJwt, Map.of("reason", REASON)).getResponse().getStatus()).isEqualTo(200);
        var submission = postJson(PUBLIC_ROOT, null, Map.of("email", EMAIL, "applicantName", "Người nộp hồ sơ",
                "phone", "0901234567", "businessName", "Dịch vụ tại nhà", "city", "Hà Nội",
                "description", "Hồ sơ đã bổ sung tài liệu", "documentUrl", "https://drive.google.com/drive/folders/updated"));
        assertThat(submission.getResponse().getStatus()).isEqualTo(201);
        assertThat(body(submission).get("status").asString()).isEqualTo("PENDING_EMAIL");
        var latest = applications.findFirstByEmailOrderByIdDesc(EMAIL).orElseThrow();
        assertThat(latest.getId()).isNotEqualTo(application.getId());
        assertThat(latest.getStatus()).isEqualTo(PENDING_EMAIL);
        var original = applications.findById(application.getId()).orElseThrow();
        assertThat(original.getStatus()).isEqualTo(REJECTED);
        assertThat(original.getRejectionReason()).isEqualTo(REASON);
    }

    @Test
    void reissuesPasswordAndRevokesOnlyProviderRefreshTokens() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        var initial = approveWithFailedMail(application.getId());
        var provider = accounts.findByEmail(EMAIL).orElseThrow();
        var previousHash = provider.getPasswordHash();
        var firstFamily = saveRefreshToken(provider);
        var secondFamily = saveRefreshToken(provider);
        var adminToken = saveRefreshToken(admin);
        var issuer = createAccount("issuer@example.test", AccountType.ADMIN);
        when(clock.instant()).thenReturn(NOW.plusSeconds(1));
        doAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            var current = accounts.findById(provider.getId()).orElseThrow();
            assertThat(passwords.matches(passwordFromMail(call.getArgument(0)), current.getPasswordHash())).isTrue();
            assertThat(revokedAt(firstFamily)).isEqualTo(NOW.plusSeconds(1));
            assertThat(auditCount()).isEqualTo(2);
            assertThat(readApplication(application.getId()).getCredentialsEmailStatus()).isEqualTo(UNCONFIRMED);
            return null;
        }).when(mail).send(any(SimpleMailMessage.class));

        var result = reissue(application.getId(), tokens.issueAccess(issuer).getTokenValue());
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        assertThat(result.getResponse().getHeader(HttpHeaders.CACHE_CONTROL)).isEqualTo("no-store");
        var reissued = body(result);
        for (String field : new String[]{"id", "status", "decidedAt", "decidedByAdminId", "providerAccountId"}) {
            assertThat(reissued.get(field)).isEqualTo(initial.get(field));
        }
        assertThat(reissued.get("credentialsEmailStatus").asString()).isEqualTo("SENT");
        assertThat(readApplication(application.getId()).getCredentialsEmailStatus()).isEqualTo(SENT);
        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(message.capture());
        assertThat(message.getValue().getTo()).containsExactly(EMAIL);
        assertThat(message.getValue().getSubject()).contains("Cấp lại mật khẩu tạm");
        String issuedPassword = passwordFromMail(message.getValue());
        var updated = accounts.findById(provider.getId()).orElseThrow();
        assertThat(updated.getMustChangePassword()).isTrue();
        assertThat(passwords.matches(issuedPassword, previousHash)).isFalse();
        assertThat(revokedAt(secondFamily)).isEqualTo(NOW.plusSeconds(1));
        assertThat(revokedAt(adminToken)).isNull();
        assertThat(profiles.count()).isEqualTo(1);
        assertThat(accounts.count()).isEqualTo(3);
        var audit = jdbc.queryForMap("select admin_id, changes from admin_audit_logs where action = ? and entity_id = ?",
                "PROVIDER_CREDENTIALS_REISSUED", application.getId().toString());
        assertThat(audit).containsEntry("ADMIN_ID", issuer.getId());
        assertThat(json.readTree((byte[]) audit.get("CHANGES")).get("providerAccountId").asLong())
                .isEqualTo(provider.getId());
        assertNoCredentials(result, application.getId(), issuedPassword, updated.getPasswordHash());
        assertError(reissue(application.getId(), adminJwt), 409, "CREDENTIAL_REISSUE_NOT_ALLOWED");
        verifyNoMoreInteractions(mail);
    }

    @Test
    void reissueSmtpFailureKeepsNewHashAndIsVisibleToAdmin() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        approveWithFailedMail(application.getId());
        var provider = accounts.findByEmail(EMAIL).orElseThrow();
        var tokenId = saveRefreshToken(provider);
        doThrow(new MailSendException("fixture SMTP detail")).when(mail).send(any(SimpleMailMessage.class));

        var failed = reissue(application.getId(), adminJwt);
        assertThat(failed.getResponse().getStatus()).isEqualTo(200);
        assertThat(body(failed).get("credentialsEmailStatus").asString()).isEqualTo("FAILED");
        assertThat(failed.getResponse().getContentAsString()).doesNotContain("fixture SMTP detail");
        String failedHash = accounts.findById(provider.getId()).orElseThrow().getPasswordHash();
        assertThat(failedHash).isNotEqualTo(provider.getPasswordHash());
        assertThat(revokedAt(tokenId)).isEqualTo(NOW);
        assertThat(auditCount()).isEqualTo(2);
        mvc.perform(get(ROOT + "/{id}", application.getId()).header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwt))
                .andExpect(status().isOk()).andExpect(jsonPath("$.credentialsEmailStatus").value("FAILED"));

        reset(mail);
        var retry = reissue(application.getId(), adminJwt);
        assertThat(retry.getResponse().getStatus()).isEqualTo(200);
        assertThat(body(retry).get("credentialsEmailStatus").asString()).isEqualTo("SENT");
        assertThat(accounts.findById(provider.getId()).orElseThrow().getPasswordHash()).isNotEqualTo(failedHash);
        assertThat(auditCount()).isEqualTo(3);
    }

    @Test
    void reissueFailureToWriteAuditRollsBackPasswordAndRevocation() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        approveWithFailedMail(application.getId());
        var provider = accounts.findByEmail(EMAIL).orElseThrow();
        var tokenId = saveRefreshToken(provider);
        jdbc.execute("alter table admin_audit_logs add constraint test_reissue_audit check (action <> 'PROVIDER_CREDENTIALS_REISSUED')");
        try {
            assertError(reissue(application.getId(), adminJwt), 409, "DATA_CONFLICT");
            assertThat(accounts.findById(provider.getId()).orElseThrow().getPasswordHash()).isEqualTo(provider.getPasswordHash());
            assertThat(revokedAt(tokenId)).isNull();
            assertThat(readApplication(application.getId()).getCredentialsEmailStatus()).isEqualTo(FAILED);
            assertThat(auditCount()).isEqualTo(1);
            verifyNoInteractions(mail);
        } finally {
            jdbc.execute("alter table admin_audit_logs drop constraint test_reissue_audit");
        }
    }

    @Test
    void reissueRejectsIneligibleAccountsAndInconsistentLinksWithoutSideEffects() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        assertError(reissue(application.getId(), adminJwt), 409, "CREDENTIAL_REISSUE_NOT_ALLOWED");
        assertError(reissue(application.getId() + 1, adminJwt), 404, "NOT_FOUND");
        approveWithFailedMail(application.getId());
        var provider = accounts.findByEmail(EMAIL).orElseThrow();
        var tokenId = saveRefreshToken(provider);
        provider.setMustChangePassword(false);
        accounts.saveAndFlush(provider);
        assertError(reissue(application.getId(), adminJwt), 409, "CREDENTIAL_REISSUE_NOT_ALLOWED");

        provider.setMustChangePassword(true);
        provider.setStatus(AccountStatus.SUSPENDED);
        provider.setSuspendedAt(NOW);
        provider.setSuspensionReason("Tài khoản test bị khóa");
        accounts.saveAndFlush(provider);
        assertError(reissue(application.getId(), adminJwt), 409, "CREDENTIAL_REISSUE_NOT_ALLOWED");
        provider.setStatus(AccountStatus.ACTIVE);
        accounts.saveAndFlush(provider);

        profiles.deleteById(provider.getId());
        assertError(reissue(application.getId(), adminJwt), 409, "DATA_CONFLICT");
        assertThat(accounts.findById(provider.getId()).orElseThrow().getPasswordHash()).isEqualTo(provider.getPasswordHash());
        assertThat(revokedAt(tokenId)).isNull();
        assertThat(auditCount()).isEqualTo(1);
        verifyNoInteractions(mail);
    }

    @Test
    void reissueRequiresCsrfAndRechecksAdminBeforeChangingExistingCredentials() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        approveWithFailedMail(application.getId());
        var provider = accounts.findByEmail(EMAIL).orElseThrow();
        var tokenId = saveRefreshToken(provider);
        mvc.perform(post(ROOT + "/{id}/reissue-credentials", application.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwt))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CSRF_INVALID"));
        assertError(reissue(application.getId(), null), 401, "AUTHENTICATION_REQUIRED");
        assertError(reissue(application.getId(), tokens.issueAccess(provider).getTokenValue()), 403, "ACCESS_DENIED");
        admin.setStatus(AccountStatus.SUSPENDED);
        admin.setSuspendedAt(NOW);
        admin.setSuspensionReason("Tài khoản test bị khóa");
        accounts.saveAndFlush(admin);
        assertError(reissue(application.getId(), adminJwt), 403, "ACCESS_DENIED");
        assertThat(accounts.findById(provider.getId()).orElseThrow().getPasswordHash()).isEqualTo(provider.getPasswordHash());
        assertThat(revokedAt(tokenId)).isNull();
        assertThat(auditCount()).isEqualTo(1);
        verifyNoInteractions(mail);
    }

    @Test
    void lateReissueEmailCannotMarkNewerPendingPasswordAsSent() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        approveWithFailedMail(application.getId());
        var firstMail = new CountDownLatch(1);
        var secondMail = new CountDownLatch(1);
        var finishFirst = new CountDownLatch(1);
        var finishSecond = new CountDownLatch(1);
        var sends = new AtomicInteger();
        doAnswer(call -> {
            if (sends.incrementAndGet() == 1) {
                firstMail.countDown();
                awaitMailRelease(finishFirst);
            } else {
                secondMail.countDown();
                awaitMailRelease(finishSecond);
                throw new MailSendException("second delivery failed");
            }
            return null;
        }).when(mail).send(any(SimpleMailMessage.class));

        try (var pool = Executors.newFixedThreadPool(2)) {
            try {
                var first = pool.submit(() -> reissue(application.getId(), adminJwt));
                assertThat(firstMail.await(5, TimeUnit.SECONDS)).isTrue();
                var second = pool.submit(() -> reissue(application.getId(), adminJwt));
                assertThat(secondMail.await(5, TimeUnit.SECONDS)).isTrue();
                finishFirst.countDown();
                var olderResponse = first.get(5, TimeUnit.SECONDS);
                assertThat(olderResponse.getResponse().getStatus()).isEqualTo(200);
                assertThat(body(olderResponse).get("credentialsEmailStatus").asString()).isEqualTo("UNCONFIRMED");
                assertThat(readApplication(application.getId()).getCredentialsEmailStatus()).isEqualTo(UNCONFIRMED);
                finishSecond.countDown();
                var newerResponse = second.get(5, TimeUnit.SECONDS);
                assertThat(newerResponse.getResponse().getStatus()).isEqualTo(200);
                assertThat(body(newerResponse).get("credentialsEmailStatus").asString()).isEqualTo("FAILED");
            } finally {
                finishFirst.countDown();
                finishSecond.countDown();
            }
        }
        var messages = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail, times(2)).send(messages.capture());
        var currentHash = accounts.findByEmail(EMAIL).orElseThrow().getPasswordHash();
        assertThat(passwords.matches(passwordFromMail(messages.getAllValues().getFirst()), currentHash)).isFalse();
        assertThat(passwords.matches(passwordFromMail(messages.getAllValues().getLast()), currentHash)).isTrue();
        assertThat(readApplication(application.getId()).getCredentialsEmailStatus()).isEqualTo(FAILED);
        assertThat(auditCount()).isEqualTo(3);
    }

    @Test
    void lateApprovalEmailCannotOverwriteReissueResult() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        var approvalMail = new CountDownLatch(1);
        var reissueMail = new CountDownLatch(1);
        var finishApproval = new CountDownLatch(1);
        var finishReissue = new CountDownLatch(1);
        doAnswer(call -> {
            SimpleMailMessage message = call.getArgument(0);
            if (message.getSubject().contains("đã được duyệt")) {
                approvalMail.countDown();
                awaitMailRelease(finishApproval);
                throw new MailSendException("approval delivery failed");
            }
            reissueMail.countDown();
            awaitMailRelease(finishReissue);
            return null;
        }).when(mail).send(any(SimpleMailMessage.class));

        try (var pool = Executors.newFixedThreadPool(2)) {
            try {
                var approval = pool.submit(() -> approve(application.getId()));
                assertThat(approvalMail.await(5, TimeUnit.SECONDS)).isTrue();
                var reissue = pool.submit(() -> reissue(application.getId(), adminJwt));
                assertThat(reissueMail.await(5, TimeUnit.SECONDS)).isTrue();
                finishApproval.countDown();
                var olderResponse = approval.get(5, TimeUnit.SECONDS);
                assertThat(olderResponse.getResponse().getStatus()).isEqualTo(200);
                assertThat(body(olderResponse).get("credentialsEmailStatus").asString()).isEqualTo("UNCONFIRMED");
                finishReissue.countDown();
                var newerResponse = reissue.get(5, TimeUnit.SECONDS);
                assertThat(newerResponse.getResponse().getStatus()).isEqualTo(200);
                assertThat(body(newerResponse).get("credentialsEmailStatus").asString()).isEqualTo("SENT");
            } finally {
                finishApproval.countDown();
                finishReissue.countDown();
            }
        }
        assertThat(readApplication(application.getId()).getCredentialsEmailStatus()).isEqualTo(SENT);
        assertThat(auditCount()).isEqualTo(2);
    }

    @Test
    void approveCommitsBeforeSendingAndReturnsTheSameDecisionOnRepeat() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        var otherAdmin = createAccount("other-admin@example.test", AccountType.ADMIN);
        doAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            var committed = readApplication(application.getId());
            assertThat(committed.getStatus()).isEqualTo(APPROVED);
            assertThat(committed.getCredentialsEmailStatus()).isEqualTo(UNCONFIRMED);
            assertThat(profiles.findByApplicationId(application.getId())).isPresent();
            assertThat(auditCount()).isEqualTo(1);
            return null;
        }).when(mail).send(any(SimpleMailMessage.class));
        var approved = postJson(ROOT + "/" + application.getId() + "/approve", adminJwt,
                Map.of("adminId", otherAdmin.getId(), "email", "other@example.test"));
        assertThat(approved.getResponse().getStatus()).isEqualTo(200);
        var decision = body(approved);
        assertThat(decision.get("decidedByAdminId").asLong()).isEqualTo(admin.getId());
        assertThat(decision.get("credentialsEmailStatus").asString()).isEqualTo("SENT");
        var provider = accounts.findByEmail(EMAIL).orElseThrow();
        assertThat(provider.getAccountType()).isEqualTo(AccountType.PROVIDER);
        assertThat(provider.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(provider.getMustChangePassword()).isTrue();
        assertThat(decision.get("providerAccountId").asLong()).isEqualTo(provider.getId());

        var repeat = approve(application.getId());
        assertThat(repeat.getResponse().getStatus()).isEqualTo(200);
        assertThat(body(repeat)).isEqualTo(decision);
        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(message.capture());
        assertThat(message.getValue().getTo()).containsExactly(EMAIL);
        String temporaryPassword = passwordFromMail(message.getValue());
        assertThat(passwords.matches(temporaryPassword, provider.getPasswordHash())).isTrue();
        assertNoCredentials(approved, application.getId(), temporaryPassword, provider.getPasswordHash());
        assertThat(auditCount()).isEqualTo(1);
        assertThat(profiles.count()).isEqualTo(1);
    }

    @Test
    void simultaneousApprovalsCreateOnlyOneAccountAndSendOneEmail() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        var otherAdminJwt = tokens.issueAccess(createAccount("other-admin@example.test", AccountType.ADMIN)).getTokenValue();
        try (var pool = Executors.newFixedThreadPool(2)) {
            var approvals = transactions.execute(status -> {
                identities.findByEmailForUpdate(EMAIL).orElseThrow();
                var first = pool.submit(() -> approve(application.getId()));
                var second = pool.submit(() -> postJson(ROOT + "/" + application.getId() + "/approve", otherAdminJwt, null));
                await().atMost(Duration.ofSeconds(5)).until(() -> jdbc.queryForObject("""
                        select count(*) from information_schema.sessions
                        where blocker_id is not null and lower(executing_statement) like '%email_identities%'
                        """, Long.class) == 2);
                return List.of(first, second);
            });
            var first = approvals.getFirst().get(5, TimeUnit.SECONDS);
            var second = approvals.getLast().get(5, TimeUnit.SECONDS);
            assertThat(first.getResponse().getStatus()).isEqualTo(200);
            assertThat(second.getResponse().getStatus()).isEqualTo(200);
            for (String field : new String[]{"providerAccountId", "decidedByAdminId", "decidedAt"}) {
                assertThat(body(first).get(field)).isEqualTo(body(second).get(field));
            }
        }
        assertThat(accounts.count()).isEqualTo(3);
        assertThat(profiles.count()).isEqualTo(1);
        assertThat(auditCount()).isEqualTo(1);
        verify(mail).send(any(SimpleMailMessage.class));
    }

    @Test
    void failedApprovalAuditLeavesApplicationPendingAndSendsNothing() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        jdbc.execute("alter table admin_audit_logs add constraint test_approve_audit check (action <> 'PROVIDER_APPLICATION_APPROVED')");
        try {
            assertError(approve(application.getId()), 409, "DATA_CONFLICT");
            assertThat(readApplication(application.getId()).getStatus()).isEqualTo(PENDING_REVIEW);
            assertThat(accounts.findByEmail(EMAIL)).isEmpty();
            assertThat(profiles.count()).isZero();
            assertThat(auditCount()).isZero();
            verifyNoInteractions(mail);
        } finally {
            jdbc.execute("alter table admin_audit_logs drop constraint test_approve_audit");
        }
    }

    @Test
    void approvalStaysUnconfirmedIfDatabaseCannotSaveTheEmailResult() throws Exception {
        var application = createApplication(PENDING_REVIEW, NOW);
        jdbc.execute("""
                alter table provider_applications add constraint test_mail_result
                check (credentials_email_status <> 'SENT')
                """);
        try {
            var decision = approve(application.getId());
            assertThat(decision.getResponse().getStatus()).isEqualTo(200);
            assertThat(body(decision).get("credentialsEmailStatus").asString()).isEqualTo("UNCONFIRMED");
            assertThat(readApplication(application.getId()).getStatus()).isEqualTo(APPROVED);
            assertThat(readApplication(application.getId()).getCredentialsEmailStatus()).isEqualTo(UNCONFIRMED);
            assertThat(auditCount()).isEqualTo(1);
            assertThat(body(approve(application.getId()))).isEqualTo(body(decision));
            verify(mail).send(any(SimpleMailMessage.class));
        } finally {
            jdbc.execute("alter table provider_applications drop constraint test_mail_result");
        }
    }

    @Test
    void listsAndReadsApplicationsWithStablePaginationAndAccountChecks() throws Exception {
        var earlier = createApplication(PENDING_REVIEW, NOW);
        var latest = createApplication("second-provider@example.test", PENDING_REVIEW, NOW);
        var unverified = createApplication("unverified@example.test", PENDING_EMAIL, null);
        mvc.perform(get(ROOT).param("page", "0").param("size", "1").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwt))
                .andExpect(status().isOk()).andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.items[0].id").value(latest.getId())).andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(get(ROOT).param("page", "1").param("size", "1").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwt))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(earlier.getId()));
        mvc.perform(get(ROOT).param("status", "PENDING_EMAIL").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwt))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(unverified.getId()));
        mvc.perform(get(ROOT + "/{id}", latest.getId()).header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwt))
                .andExpect(status().isOk()).andExpect(jsonPath("$.documentUrl").value(latest.getDocumentUrl()))
                .andExpect(jsonPath("$.passwordHash").doesNotExist()).andExpect(jsonPath("$.registrationToken").doesNotExist());
        assertError(mvc.perform(get(ROOT).param("size", "101").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwt)).andReturn(),
                400, "VALIDATION_ERROR");
        assertError(mvc.perform(get(ROOT + "/{id}", unverified.getId() + 1).header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwt)).andReturn(),
                404, "NOT_FOUND");
        assertError(mvc.perform(get(ROOT)).andReturn(), 401, "AUTHENTICATION_REQUIRED");
        var customer = createAccount("customer@example.test", AccountType.CUSTOMER);
        assertError(mvc.perform(get(ROOT).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokens.issueAccess(customer).getTokenValue())).andReturn(),
                403, "ACCESS_DENIED");
        admin.setStatus(AccountStatus.SUSPENDED);
        admin.setSuspendedAt(NOW);
        admin.setSuspensionReason("Tài khoản test bị khóa");
        accounts.saveAndFlush(admin);
        assertError(mvc.perform(get(ROOT + "/{id}", latest.getId()).header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwt)).andReturn(),
                403, "ACCESS_DENIED");
    }

    private ProviderApplication createApplication(ProviderApplicationStatus state, Instant verifiedAt) {
        return createApplication(EMAIL, state, verifiedAt);
    }

    private ProviderApplication createApplication(String email, ProviderApplicationStatus state, Instant verifiedAt) {
        identities.saveAndFlush(new EmailIdentity(email, AccountType.PROVIDER));
        var application = new ProviderApplication();
        application.setEmail(email);
        application.setApplicantName("Người nộp hồ sơ");
        application.setPhone("0901234567");
        application.setBusinessName("Dịch vụ tại nhà");
        application.setCity("Hà Nội");
        application.setDescription("Hồ sơ thử nghiệm");
        application.setDocumentUrl("https://drive.google.com/drive/folders/sample");
        application.setStatus(state);
        application.setEmailVerifiedAt(verifiedAt);
        application.setCreatedAt(NOW);
        return applications.saveAndFlush(application);
    }

    private Account createAccount(String email, AccountType type) {
        var identity = identities.saveAndFlush(new EmailIdentity(email, type));
        var account = new Account();
        account.setEmail(email);
        account.setEmailIdentity(identity);
        account.setAccountType(type);
        account.setDisplayName("Tài khoản test");
        account.setPasswordHash("unused-test-fixture");
        account.setEmailVerifiedAt(NOW);
        account.setStatus(AccountStatus.ACTIVE);
        return accounts.saveAndFlush(account);
    }

    private UUID saveRefreshToken(Account account) {
        var token = new RefreshToken();
        token.setId(UUID.randomUUID());
        token.setAccount(account);
        token.setFamilyId(UUID.randomUUID());
        token.setTokenHash(randomValues.hashToken(token.getId().toString()));
        token.setCreatedAt(NOW);
        token.setExpiresAt(NOW.plus(Duration.ofDays(1)));
        return refreshTokens.saveAndFlush(token).getId();
    }

    private Instant revokedAt(UUID tokenId) {
        return refreshTokens.findById(tokenId).orElseThrow().getRevokedAt();
    }

    private ProviderApplication readApplication(Long id) {
        return applications.findById(id).orElseThrow();
    }

    private JsonNode approveWithFailedMail(Long id) throws Exception {
        doThrow(new MailSendException("fixture SMTP detail")).when(mail).send(any(SimpleMailMessage.class));
        var approved = approve(id);
        assertThat(approved.getResponse().getStatus()).isEqualTo(200);
        var decision = body(approved);
        assertThat(decision.get("status").asString()).isEqualTo("APPROVED");
        assertThat(decision.get("credentialsEmailStatus").asString()).isEqualTo("FAILED");
        assertThat(readApplication(id).getCredentialsEmailStatus()).isEqualTo(FAILED);
        reset(mail);
        return decision;
    }

    private MvcResult approve(Long id) throws Exception {
        return postJson(ROOT + "/" + id + "/approve", adminJwt, null);
    }

    private MvcResult reissue(Long id, String jwt) throws Exception {
        return postJson(ROOT + "/" + id + "/reissue-credentials", jwt, null);
    }

    private String passwordFromMail(SimpleMailMessage mailMessage) {
        var matcher = TEMPORARY_PASSWORD.matcher(mailMessage.getText());
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private void assertNoCredentials(MvcResult result, Long id, String password, String hash) throws Exception {
        assertThat(result.getResponse().getContentAsString().contains(password)).isFalse();
        assertThat(result.getResponse().getContentAsString().contains(hash)).isFalse();
        var changes = jdbc.queryForList("select cast(changes as varchar) from admin_audit_logs where entity_id = ?",
                String.class, id.toString());
        assertThat(changes.stream().anyMatch(entry -> entry.contains(password) || entry.contains(hash))).isFalse();
    }

    private static void awaitMailRelease(CountDownLatch release) throws InterruptedException {
        if (!release.await(10, TimeUnit.SECONDS)) throw new AssertionError("Timed out waiting to release fake SMTP");
    }

    private MvcResult reject(Long id, String jwt, Map<String, ?> payload) throws Exception {
        return postJson(ROOT + "/" + id + "/reject", jwt, payload);
    }

    private MvcResult postJson(String path, String jwt, Map<String, ?> payload) throws Exception {
        var csrf = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn();
        Cookie cookie = csrf.getResponse().getCookie("XSRF-TOKEN");
        var request = post(path).cookie(cookie).header("X-XSRF-TOKEN", body(csrf).get("token").asString());
        if (jwt != null) request.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt);
        if (payload != null) request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload));
        return mvc.perform(request).andReturn();
    }

    private JsonNode body(MvcResult response) throws Exception {
        return json.readTree(response.getResponse().getContentAsString());
    }

    private void assertError(MvcResult result, int status, String code) throws Exception {
        assertThat(result.getResponse().getStatus()).isEqualTo(status);
        assertThat(body(result).get("code").asString()).isEqualTo(code);
    }

    private long auditCount() {
        return jdbc.queryForObject("select count(*) from admin_audit_logs", Long.class);
    }
}
