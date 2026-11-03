package com.homeservice.provider;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.auth.entity.EmailChallenge;
import com.homeservice.auth.entity.EmailIdentity;
import com.homeservice.auth.enums.EmailChallengePurpose;
import com.homeservice.auth.repository.EmailChallengeRepository;
import com.homeservice.auth.repository.EmailIdentityRepository;
import com.homeservice.auth.repository.RefreshTokenRepository;
import com.homeservice.auth.service.TokenService;
import com.homeservice.provider.entity.ProviderApplication;
import com.homeservice.provider.enums.ProviderApplicationStatus;
import com.homeservice.provider.repository.ProviderApplicationRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:nestify-provider-test;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProviderApplicationIntegrationTests {
    private static final String ROOT = "/api/provider-applications";
    private static final String EMAIL = "provider@example.com";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired ProviderApplicationRepository applications;
    @Autowired EmailIdentityRepository identities;
    @Autowired AccountRepository accounts;
    @Autowired EmailChallengeRepository challenges;
    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired PasswordEncoder passwords;
    @Autowired TokenService tokens;
    @Autowired com.homeservice.auth.service.PendingRegistrationCleanup cleanup;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactionManager;
    @Autowired com.homeservice.config.properties.AuthProperties authProperties;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean JavaMailSender mail;
    @MockitoBean Clock clock;
    Instant now;

    @BeforeEach
    void resetData() {
        challenges.deleteAllInBatch();
        applications.deleteAllInBatch();
        refreshTokens.deleteAllInBatch();
        accounts.deleteAllInBatch();
        identities.deleteAllInBatch();
        now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        when(clock.instant()).thenAnswer(invocation -> now);
    }

    @Test
    void submissionAndVerificationOnlyCreateAReservedEmailAndReviewApplication() throws Exception {
        Browser browser = new Browser();
        var payload = submission();
        payload.put("email", "  PROVIDER@Example.com  ");
        MvcResult submitted = browser.post(ROOT, payload);
        status(submitted, 201);
        assertThat(body(submitted).get("email").asString()).isEqualTo(EMAIL);
        assertThat(body(submitted).get("status").asString()).isEqualTo("PENDING_EMAIL");
        assertThat(submitted.getResponse().getContentAsString()).doesNotContain("\"id\"", "applicantName", "password", "accessToken");
        assertThat(submitted.getResponse().getHeader("Cache-Control")).contains("no-store");
        ProviderApplication app = latestApplication();
        assertThat(app.getApplicantName()).isEqualTo("Người nộp hồ sơ");
        assertThat(app.getBusinessName()).isEqualTo("Dịch vụ tại nhà");
        assertThat(app.getCity()).isEqualTo("Hà Nội");
        assertThat(app.getEmailVerifiedAt()).isNull();
        assertThat(identities.findById(EMAIL).orElseThrow().getAccountType()).isEqualTo(AccountType.PROVIDER);
        EmailChallenge challenge = latestChallenge();
        String code = sentCode();
        assertThat(challenge.getAccount()).isNull();
        assertThat(challenge.getProviderApplication().getId()).isEqualTo(app.getId());
        assertThat(passwords.matches(code, challenge.getCodeHash())).isTrue();
        assertThat(browser.token).matches("[A-Za-z0-9_-]{43}");
        assertThat(challenge.getRegistrationTokenHash()).isEqualTo(tokens.hashToken(browser.token)).isNotEqualTo(browser.token);
        assertThat(challenge.getExpiresAt()).isEqualTo(now.plusSeconds(600));
        assertThat(body(submitted).get("resendAvailableAt").asString()).isEqualTo(now.plusSeconds(60).toString());
        MvcResult verified = browser.post(ROOT + "/verify-email", browser.verification(code));
        status(verified, 200);
        assertThat(body(verified).get("status").asString()).isEqualTo("PENDING_REVIEW");
        assertThat(verified.getResponse().getContentAsString()).doesNotContain("registrationToken", "expiresAt", "\"id\"");
        assertThat(latestApplication().getEmailVerifiedAt()).isEqualTo(now);
        assertThat(latestChallenge().getConsumedAt()).isEqualTo(now);
        assertThat(accounts.count()).isZero();
        assertThat(refreshTokens.count()).isZero();
        assertThat(jdbc.queryForObject("select count(*) from provider_profiles", Long.class)).isZero();
        assertThat(browser.cookies).doesNotContainKeys("NESTIFY_REFRESH", "JSESSIONID");
        error(browser.post(ROOT + "/verify-email", browser.verification(code)), 400, "REGISTRATION_INVALID");
        error(browser.post(ROOT + "/resend-verification", browser.resend()), 400, "REGISTRATION_INVALID");
        error(browser.post(ROOT, submission()), 409, "APPLICATION_ALREADY_EXISTS");
    }

    @Test
    void pendingResubmissionReplacesDetailsAndBindsOtpToANewToken() throws Exception {
        Browser first = submit();
        String oldCode = sentCode();
        Long id = latestApplication().getId();
        Instant originalCreatedAt = latestApplication().getCreatedAt();
        Long challengeId = latestChallenge().getId();
        Browser owner = new Browser();
        var replacement = submission();
        replacement.put("businessName", "Tên mới");
        error(owner.post(ROOT, replacement), 429, "OTP_RESEND_TOO_SOON");
        assertThat(latestApplication().getBusinessName()).isEqualTo("Dịch vụ tại nhà");
        now = now.plusSeconds(60);
        status(owner.post(ROOT, replacement), 201);
        String newCode = sentCode();
        assertThat(owner.token).isNotEqualTo(first.token);
        assertThat(newCode).isNotEqualTo(oldCode);
        assertThat(applications.count()).isEqualTo(1);
        assertThat(latestApplication().getId()).isEqualTo(id);
        assertThat(latestApplication().getCreatedAt()).isEqualTo(originalCreatedAt);
        assertThat(latestApplication().getBusinessName()).isEqualTo("Tên mới");
        assertThat(challenges.findById(challengeId).orElseThrow().getInvalidatedAt()).isEqualTo(now);
        error(first.post(ROOT + "/verify-email", first.verification(newCode)), 400, "REGISTRATION_INVALID");
        error(first.post(ROOT + "/resend-verification", first.resend()), 400, "REGISTRATION_INVALID");
        assertThat(latestChallenge().getAttemptCount()).isZero();
        error(owner.post(ROOT + "/verify-email", owner.verification(oldCode)), 400, "OTP_INVALID");
        status(owner.post(ROOT + "/verify-email", owner.verification(newCode)), 200);
    }

    @Test
    void rejectedApplicationIsPreservedAndANewSubmissionHasItsOwnChallenge() throws Exception {
        Browser first = submit();
        status(first.post(ROOT + "/verify-email", first.verification(sentCode())), 200);
        ProviderApplication old = latestApplication();
        old.setStatus(ProviderApplicationStatus.REJECTED);
        old.setRejectionReason("Hồ sơ thiếu giấy tờ");
        old.setDecidedAt(now);
        applications.saveAndFlush(old);
        Browser second = submit();
        assertThat(applications.count()).isEqualTo(2);
        assertThat(latestApplication().getId()).isNotEqualTo(old.getId());
        ProviderApplication preserved = applications.findById(old.getId()).orElseThrow();
        assertThat(preserved.getStatus()).isEqualTo(ProviderApplicationStatus.REJECTED);
        assertThat(preserved.getRejectionReason()).isEqualTo("Hồ sơ thiếu giấy tờ");
        assertThat(preserved.getEmailVerifiedAt()).isEqualTo(now);
        error(first.post(ROOT + "/verify-email", first.verification(sentCode())), 400, "REGISTRATION_INVALID");
        assertThat(latestChallenge().getAttemptCount()).isZero();
        status(second.post(ROOT + "/verify-email", second.verification(sentCode())), 200);
    }

    @Test
    void approvedApplicationCannotBeOverwritten() throws Exception {
        submit();
        ProviderApplication app = latestApplication();
        app.setStatus(ProviderApplicationStatus.APPROVED);
        applications.saveAndFlush(app);
        now = now.plusSeconds(600);
        error(new Browser().post(ROOT, submission()), 409, "APPLICATION_ALREADY_EXISTS");
        assertThat(challenges.count()).isEqualTo(1);
        assertThat(latestApplication().getStatus()).isEqualTo(ProviderApplicationStatus.APPROVED);
    }

    @Test
    void customerAndAdminReservationsAndExistingProviderAccountsCannotSubmit() throws Exception {
        for (AccountType type : AccountType.values()) {
            identities.saveAndFlush(new EmailIdentity(EMAIL, type));
            if (type == AccountType.PROVIDER) {
                Account account = new Account();
                account.setEmail(EMAIL);
                account.setAccountType(type);
                account.setDisplayName("Provider");
                account.setPasswordHash(passwords.encode("Password-123!"));
                account.setStatus(AccountStatus.SUSPENDED);
                account.setSuspendedAt(now);
                account.setSuspensionReason("Test suspension");
                account.setEmailVerifiedAt(now);
                accounts.saveAndFlush(account);
            }
            error(new Browser().post(ROOT, submission()), 409, "EMAIL_ALREADY_USED");
            accounts.deleteAllInBatch();
            identities.deleteAllInBatch();
        }
        assertThat(applications.count()).isZero();
        verifyNoInteractions(mail);
    }

    @Test
    void providerReservationWithoutAnApplicationCanSubmitButCustomerRegistrationCannotUseIt() throws Exception {
        identities.saveAndFlush(new EmailIdentity(EMAIL, AccountType.PROVIDER));
        submit();
        Browser browser = new Browser();
        error(browser.post("/api/auth/register/customer", Map.of("email", EMAIL, "password", "Password-123!",
                "displayName", "Khách", "phone", "0901234567")), 409, "EMAIL_ALREADY_USED");
        assertThat(accounts.count()).isZero();
    }

    @Test
    void incorrectTokenOrAnotherEmailCannotConsumeAttemptsOrSendMail() throws Exception {
        Browser browser = submit();
        Map<String, String> wrong = Map.of("email", EMAIL, "code", sentCode(), "registrationToken", tokens.generateRandomValue());
        error(browser.post(ROOT + "/verify-email", wrong), 400, "REGISTRATION_INVALID");
        error(browser.post(ROOT + "/resend-verification", wrong), 400, "REGISTRATION_INVALID");
        error(browser.post(ROOT + "/verify-email", Map.of("email", "other@example.com", "code", sentCode(),
                "registrationToken", browser.token)), 400, "REGISTRATION_INVALID");
        error(browser.post(ROOT + "/verify-email", Map.of("email", EMAIL, "code", sentCode())), 400, "VALIDATION_ERROR");
        assertThat(latestChallenge().getAttemptCount()).isZero();
        verify(mail, times(1)).send(any(SimpleMailMessage.class));
    }

    @Test
    void wrongOtpQuotaCommitsAndResendRestartsQuotaWithTheSameToken() throws Exception {
        Browser browser = submit();
        String originalToken = browser.token;
        String code = sentCode();
        String wrong = "000000".equals(code) ? "000001" : "000000";
        for (int i = 1; i <= 5; i++) {
            error(browser.post(ROOT + "/verify-email", browser.verification(wrong)),
                    i == 5 ? 429 : 400, i == 5 ? "OTP_ATTEMPTS_EXCEEDED" : "OTP_INVALID");
            assertThat(latestChallenge().getAttemptCount()).isEqualTo(i);
        }
        assertThat(latestChallenge().getInvalidatedAt()).isEqualTo(now);
        error(browser.post(ROOT + "/verify-email", browser.verification(code)), 429, "OTP_ATTEMPTS_EXCEEDED");
        error(browser.post(ROOT + "/resend-verification", browser.resend()), 429, "OTP_RESEND_TOO_SOON");
        now = now.plusSeconds(60);
        status(browser.post(ROOT + "/resend-verification", browser.resend()), 200);
        assertThat(browser.token).isEqualTo(originalToken);
        assertThat(latestChallenge().getAttemptCount()).isZero();
        assertThat(sentCode()).isNotEqualTo(code);
        error(browser.post(ROOT + "/verify-email", browser.verification(code)), 400, "OTP_INVALID");
        status(browser.post(ROOT + "/verify-email", browser.verification(sentCode())), 200);
    }

    @Test
    void expiredOtpCannotVerifyButItsTokenCanResend() throws Exception {
        Browser browser = submit();
        String code = sentCode();
        now = now.plusSeconds(600);
        error(browser.post(ROOT + "/verify-email", browser.verification(code)), 400, "OTP_INVALID");
        assertThat(latestChallenge().getAttemptCount()).isZero();
        status(browser.post(ROOT + "/resend-verification", browser.resend()), 200);
        assertThat(latestChallenge().getExpiresAt()).isEqualTo(now.plusSeconds(600));
        status(browser.post(ROOT + "/verify-email", browser.verification(sentCode())), 200);
    }

    @Test
    void legacyChallengeWithoutTokenRequiresANewSubmission() throws Exception {
        Browser browser = submit();
        jdbc.update("update email_challenges set registration_token_hash = null");
        error(browser.post(ROOT + "/verify-email", browser.verification(sentCode())), 400, "REGISTRATION_INVALID");
        error(browser.post(ROOT + "/resend-verification", browser.resend()), 400, "REGISTRATION_INVALID");
        now = now.plusSeconds(60);
        status(browser.post(ROOT, submission()), 201);
        status(browser.post(ROOT + "/verify-email", browser.verification(sentCode())), 200);
    }

    @Test
    void smtpFailureRollsBackNewAndReplacementSubmissionsAndResends() throws Exception {
        Browser browser = new Browser();
        doThrow(new MailSendException("SMTP unavailable")).when(mail).send(any(SimpleMailMessage.class));
        status(browser.post(ROOT, submission()), 503);
        assertThat(applications.count()).isZero();
        assertThat(identities.count()).isZero();
        assertThat(challenges.count()).isZero();
        reset(mail);
        status(browser.post(ROOT, submission()), 201);
        String code = sentCode();
        Long challengeId = latestChallenge().getId();
        now = now.plusSeconds(60);
        doThrow(new MailSendException("SMTP unavailable")).when(mail).send(any(SimpleMailMessage.class));
        var replacement = submission();
        replacement.put("businessName", "Không được lưu");
        status(browser.post(ROOT, replacement), 503);
        status(browser.post(ROOT + "/resend-verification", browser.resend()), 503);
        assertThat(applications.count()).isEqualTo(1);
        assertThat(challenges.count()).isEqualTo(1);
        assertThat(latestApplication().getBusinessName()).isEqualTo("Dịch vụ tại nhà");
        assertThat(latestChallenge().getId()).isEqualTo(challengeId);
        assertThat(latestChallenge().getInvalidatedAt()).isNull();
        status(browser.post(ROOT + "/verify-email", browser.verification(code)), 200);
    }

    @Test
    void rejectsInvalidFieldsAndNonDriveOrUnsafeDocumentUrls() throws Exception {
        Browser browser = new Browser();
        for (String url : List.of("http://drive.google.com/file/d/test", "javascript:alert(1)",
                "https://example.com/file", "https://drive.google.com.attacker.com/file",
                "https://user@drive.google.com/file", "https://drive.google.com:8443/file",
                "https://drive.google.com/", "not a URL", " ", "https://drive.google.com/" + "x".repeat(2048))) {
            var payload = submission();
            payload.put("documentUrl", url);
            error(browser.post(ROOT, payload), 400, "VALIDATION_ERROR");
        }
        for (String field : List.of("email", "applicantName", "phone", "businessName", "city", "description")) {
            var payload = submission();
            payload.put(field, " ");
            error(browser.post(ROOT, payload), 400, "VALIDATION_ERROR");
        }
        var payload = submission();
        payload.put("description", "x".repeat(5001));
        error(browser.post(ROOT, payload), 400, "VALIDATION_ERROR");
        assertThat(applications.count()).isZero();
        verifyNoInteractions(mail);
    }

    @Test
    void acceptsDriveFileFolderAndDocsLinksWithoutFetchingThem() throws Exception {
        Browser browser = new Browser();
        for (String url : List.of("https://drive.google.com/file/d/test/view?usp=sharing",
                "https://drive.google.com/drive/folders/test", "https://docs.google.com/document/d/test/edit")) {
            var payload = submission();
            payload.put("documentUrl", " " + url + " ");
            status(browser.post(ROOT, payload), 201);
            assertThat(latestApplication().getDocumentUrl()).isEqualTo(url);
            now = now.plusSeconds(60);
        }
    }

    @Test
    void allThreePublicPostEndpointsRequireCsrfAndIgnoreAnExpiredBearer() throws Exception {
        for (String path : List.of(ROOT, ROOT + "/verify-email", ROOT + "/resend-verification")) {
            error(mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{}")
                    .header("Authorization", "Bearer expired")).andReturn(), 403, "CSRF_INVALID");
        }
        Browser browser = submit(); // Browser always includes an unusable Bearer with valid CSRF.
        now = now.plusSeconds(60);
        status(browser.post(ROOT + "/resend-verification", browser.resend()), 200);
        status(browser.post(ROOT + "/verify-email", browser.verification(sentCode())), 200);
        status(mvc.perform(get(ROOT)).andReturn(), 401);
        status(mvc.perform(post(ROOT + "/1/verify-email")).andReturn(), 403);
    }

    @Test
    void concurrentWrongCodesCannotExceedTheOtpQuota() throws Exception {
        Browser original = submit();
        String code = sentCode();
        String wrong = "000000".equals(code) ? "000001" : "000000";
        List<Browser> browsers = IntStream.range(0, 6).mapToObj(i -> new Browser()).toList();
        for (Browser browser : browsers) browser.token = original.token;
        try (var pool = Executors.newFixedThreadPool(6)) {
            List<Callable<Integer>> tasks = browsers.stream().<Callable<Integer>>map(browser ->
                    () -> browser.post(ROOT + "/verify-email", browser.verification(wrong)).getResponse().getStatus()).toList();
            var results = pool.invokeAll(tasks);
            var statuses = new java.util.ArrayList<Integer>();
            for (var result : results) statuses.add(result.get());
            assertThat(statuses).containsOnly(400, 429);
            assertThat(statuses.stream().filter(s -> s == 400).count()).isEqualTo(4);
            assertThat(statuses.stream().filter(s -> s == 429).count()).isEqualTo(2);
        }
        assertThat(latestChallenge().getAttemptCount()).isEqualTo(5);
    }

    @Test
    void concurrentPendingSubmissionsHaveOneWinnerAndOneCurrentToken() throws Exception {
        submit();
        now = now.plusSeconds(60);
        var firstPayload = submission();
        firstPayload.put("businessName", "Hồ sơ A");
        var secondPayload = submission();
        secondPayload.put("businessName", "Hồ sơ B");
        Browser first = new Browser();
        Browser second = new Browser();
        try (var pool = Executors.newFixedThreadPool(2)) {
            var results = pool.invokeAll(List.<Callable<MvcResult>>of(
                    () -> first.post(ROOT, firstPayload), () -> second.post(ROOT, secondPayload)));
            MvcResult a = results.get(0).get();
            MvcResult b = results.get(1).get();
            assertThat(List.of(a.getResponse().getStatus(), b.getResponse().getStatus())).containsExactlyInAnyOrder(201, 429);
            Browser winner = a.getResponse().getStatus() == 201 ? first : second;
            assertThat(latestApplication().getBusinessName()).isEqualTo(a.getResponse().getStatus() == 201 ? "Hồ sơ A" : "Hồ sơ B");
            assertThat(latestChallenge().getRegistrationTokenHash()).isEqualTo(tokens.hashToken(winner.token));
            status(winner.post(ROOT + "/verify-email", winner.verification(sentCode())), 200);
        }
        assertThat(applications.count()).isEqualTo(1);
        assertThat(challenges.count()).isEqualTo(2);
    }

    @Test
    void concurrentFirstSubmissionsCannotCreateDuplicateApplications() throws Exception {
        try (var pool = Executors.newFixedThreadPool(2)) {
            var results = pool.invokeAll(List.<Callable<MvcResult>>of(
                    () -> new Browser().post(ROOT, submission()), () -> new Browser().post(ROOT, submission())));
            var statuses = List.of(results.get(0).get().getResponse().getStatus(), results.get(1).get().getResponse().getStatus());
            assertThat(statuses).contains(201);
            assertThat(statuses.stream().filter(s -> s == 201).count()).isEqualTo(1);
            assertThat(statuses).allMatch(s -> s == 201 || s == 409 || s == 429);
        }
        assertThat(identities.count()).isEqualTo(1);
        assertThat(applications.count()).isEqualTo(1);
        assertThat(challenges.count()).isEqualTo(1);
    }

    @Test
    void concurrentCustomerAndProviderRegistrationCannotReserveTheSameEmailForBothRoles() throws Exception {
        try (var pool = Executors.newFixedThreadPool(2)) {
            var results = pool.invokeAll(List.<Callable<MvcResult>>of(
                    () -> new Browser().post(ROOT, submission()),
                    () -> new Browser().post("/api/auth/register/customer", Map.of("email", EMAIL,
                            "password", "Password-123!", "displayName", "Khách", "phone", "0901234567"))));
            assertThat(List.of(results.get(0).get().getResponse().getStatus(), results.get(1).get().getResponse().getStatus()))
                    .containsExactlyInAnyOrder(201, 409);
        }
        assertThat(identities.count()).isEqualTo(1);
        assertThat(applications.count() + accounts.count()).isEqualTo(1);
        assertThat(challenges.count()).isEqualTo(1);
        assertThat(identities.findById(EMAIL).orElseThrow().getAccountType())
                .isEqualTo(applications.count() == 1 ? AccountType.PROVIDER : AccountType.CUSTOMER);
    }

    @Test
    void concurrentVerifyAndResubmitCannotVerifyReplacementDetailsUsingAnOldToken() throws Exception {
        Browser first = submit();
        String code = sentCode();
        now = now.plusSeconds(60);
        var replacement = submission();
        replacement.put("businessName", "Hồ sơ thay thế");
        try (var pool = Executors.newFixedThreadPool(2)) {
            var results = pool.invokeAll(List.<Callable<MvcResult>>of(
                    () -> first.post(ROOT + "/verify-email", first.verification(code)),
                    () -> new Browser().post(ROOT, replacement)));
            MvcResult verified = results.get(0).get();
            MvcResult submitted = results.get(1).get();
            if (verified.getResponse().getStatus() == 200) {
                error(submitted, 409, "APPLICATION_ALREADY_EXISTS");
                assertThat(latestApplication().getStatus()).isEqualTo(ProviderApplicationStatus.PENDING_REVIEW);
                assertThat(latestApplication().getBusinessName()).isEqualTo("Dịch vụ tại nhà");
            } else {
                error(verified, 400, "REGISTRATION_INVALID");
                status(submitted, 201);
                assertThat(latestApplication().getStatus()).isEqualTo(ProviderApplicationStatus.PENDING_EMAIL);
                assertThat(latestApplication().getBusinessName()).isEqualTo("Hồ sơ thay thế");
                assertThat(latestApplication().getEmailVerifiedAt()).isNull();
            }
        }
    }

    @Test
    void deadlineCapsOtpRejectsExpiredOperationsAndReplacementRollsBackOnMailFailure() throws Exception {
        Browser old = submit();
        ProviderApplication original = latestApplication();
        Instant created = original.getCreatedAt();
        now = created.plusSeconds(24 * 3600 - 30);
        status(old.post(ROOT + "/resend-verification", old.resend()), 200);
        String code = sentCode();
        assertThat(latestChallenge().getExpiresAt()).isEqualTo(created.plusSeconds(24 * 3600));
        assertThat(latestApplication().getCreatedAt()).isEqualTo(created);
        now = created.plusSeconds(24 * 3600);
        jdbc.update("update email_challenges set expires_at = ? where id = ?", java.sql.Timestamp.from(now.plusSeconds(600)), latestChallenge().getId());
        long count = challenges.count();
        error(old.post(ROOT + "/verify-email", old.verification(code)), 400, "REGISTRATION_INVALID");
        error(old.post(ROOT + "/resend-verification", old.resend()), 400, "REGISTRATION_INVALID");
        assertThat(challenges.count()).isEqualTo(count);
        verify(mail, times(2)).send(any(SimpleMailMessage.class));
        now = now.plusSeconds(1);
        error(old.post(ROOT + "/verify-email", old.verification(code)), 400, "REGISTRATION_INVALID");
        error(old.post(ROOT + "/resend-verification", old.resend()), 400, "REGISTRATION_INVALID");
        verify(mail, times(2)).send(any(SimpleMailMessage.class));
        doThrow(new MailSendException("test failure")).when(mail).send(any(SimpleMailMessage.class));
        status(new Browser().post(ROOT, submission()), 503);
        assertThat(latestApplication().getId()).isEqualTo(original.getId());
        error(old.post(ROOT + "/verify-email", old.verification(code)), 400, "REGISTRATION_INVALID");
        reset(mail);
        Browser replacement = submit();
        assertThat(latestApplication().getId()).isNotEqualTo(original.getId());
        assertThat(latestApplication().getCreatedAt()).isEqualTo(now);
        assertThat(replacement.token).isNotEqualTo(old.token);
        error(old.post(ROOT + "/verify-email", old.verification(sentCode())), 400, "REGISTRATION_INVALID");
    }

    @Test
    void otpJustBeforeDeadlineCanMoveProviderToReview() throws Exception {
        Browser browser = submit();
        Instant created = latestApplication().getCreatedAt();
        now = created.plusSeconds(24 * 3600 - 60);
        status(browser.post(ROOT + "/resend-verification", browser.resend()), 200);
        String code = sentCode();
        now = created.plusSeconds(24 * 3600 - 1);
        status(browser.post(ROOT + "/verify-email", browser.verification(code)), 200);
    }

    @Test
    void expiredRegistrationsCanChangeRoleButRejectedHistoryStillReservesProviderIdentity() throws Exception {
        Browser customer = new Browser();
        status(customer.post("/api/auth/register/customer", Map.of("email", EMAIL, "password", "Password-123!", "displayName", "Khách")), 201);
        now = now.plusSeconds(86400);
        Browser provider = submit();
        assertThat(accounts.count()).isZero();
        assertThat(identities.findById(EMAIL).orElseThrow().getAccountType()).isEqualTo(AccountType.PROVIDER);
        now = now.plusSeconds(86400);
        status(new Browser().post("/api/auth/register/customer", Map.of("email", EMAIL, "password", "Password-123!", "displayName", "Khách")), 201);
        assertThat(applications.count()).isZero();
        assertThat(identities.findById(EMAIL).orElseThrow().getAccountType()).isEqualTo(AccountType.CUSTOMER);
    }

    @Test
    void cleanupOfPendingProviderPreservesRejectedHistoryAndItsChallenge() throws Exception {
        Browser first = submit();
        status(first.post(ROOT + "/verify-email", first.verification(sentCode())), 200);
        ProviderApplication rejected = latestApplication();
        Long rejectedChallenge = latestChallenge().getId();
        rejected.setStatus(ProviderApplicationStatus.REJECTED);
        applications.saveAndFlush(rejected);
        submit();
        now = now.plusSeconds(86400);
        status(new Browser().post("/api/auth/register/customer", Map.of("email", EMAIL, "password", "Password-123!", "displayName", "Khách")), 409);
        // Conflict rolls back cleanup in the same transaction; submitting as provider can clean it.
        submit();
        assertThat(applications.findById(rejected.getId()).orElseThrow().getStatus()).isEqualTo(ProviderApplicationStatus.REJECTED);
        assertThat(challenges.existsById(rejectedChallenge)).isTrue();
        assertThat(identities.findById(EMAIL).orElseThrow().getAccountType()).isEqualTo(AccountType.PROVIDER);
        assertThat(applications.count()).isEqualTo(2);
    }

    @Test
    void cleanupJobProcessesMultipleBatchesAndRollsBackAnIndividualForeignKeyFailure() throws Exception {
        Browser review = submit();
        status(review.post(ROOT + "/verify-email", review.verification(sentCode())), 200);
        var expiredProvider = submission();
        expiredProvider.put("email", "pending@cleanup.example.com");
        status(new Browser().post(ROOT, expiredProvider), 201);
        Long pendingId = applications.findFirstByEmailOrderByIdDesc("pending@cleanup.example.com").orElseThrow().getId();
        Long pendingChallengeId = challenges.findFirstByProviderApplicationIdAndPurposeOrderByIdDesc(pendingId, EmailChallengePurpose.VERIFY_PROVIDER_APPLICATION).orElseThrow().getId();
        for (String statusName : List.of("approved", "rejected")) {
            String address = statusName + "@protected.example.com";
            var payload = submission();
            payload.put("email", address);
            status(new Browser().post(ROOT, payload), 201);
            ProviderApplication protectedApp = applications.findFirstByEmailOrderByIdDesc(address).orElseThrow();
            protectedApp.setStatus(statusName.equals("approved") ? ProviderApplicationStatus.APPROVED : ProviderApplicationStatus.REJECTED);
            protectedApp.setEmailVerifiedAt(now);
            applications.saveAndFlush(protectedApp);
        }
        for (String email : List.of("a-blocked@example.com", "b-clean@example.com", "c-clean@example.com")) {
            status(new Browser().post("/api/auth/register/customer", Map.of("email", email,
                    "password", "Password-123!", "displayName", "Khách")), 201);
        }
        for (String kind : List.of("active", "suspended", "provider", "admin")) {
            String address = kind + "@protected.example.com";
            AccountType type = kind.equals("provider") ? AccountType.PROVIDER : kind.equals("admin") ? AccountType.ADMIN : AccountType.CUSTOMER;
            identities.saveAndFlush(new EmailIdentity(address, type));
            Account protectedAccount = new Account();
            protectedAccount.setEmail(address);
            protectedAccount.setAccountType(type);
            protectedAccount.setPasswordHash("test-hash");
            protectedAccount.setDisplayName("Protected");
            protectedAccount.setStatus(kind.equals("active") ? AccountStatus.ACTIVE : kind.equals("suspended") ? AccountStatus.SUSPENDED : AccountStatus.PENDING_EMAIL);
            if (kind.equals("active")) protectedAccount.setEmailVerifiedAt(now);
            if (kind.equals("suspended")) { protectedAccount.setSuspendedAt(now); protectedAccount.setSuspensionReason("test"); }
            protectedAccount.setCreatedAt(now);
            accounts.saveAndFlush(protectedAccount);
        }
        Account blocked = accounts.findByEmail("a-blocked@example.com").orElseThrow();
        Long blockedChallenge = challenges.findFirstByAccountIdAndPurposeOrderByIdDesc(blocked.getId(), EmailChallengePurpose.REGISTER_CUSTOMER).orElseThrow().getId();
        jdbc.update("insert into customer_addresses (customer_id, label, recipient_name, recipient_phone, address_line, city, is_default, created_at, updated_at) values (?, 'Home', 'Test', '123', 'Street', 'City', false, current_timestamp, current_timestamp)", blocked.getId());
        now = now.plusSeconds(86400);
        var enabled = new com.homeservice.config.properties.AuthProperties(authProperties.otpTtl(), authProperties.otpResendInterval(),
                authProperties.otpMaxAttempts(), authProperties.pendingRegistrationTtl(),
                new com.homeservice.config.properties.AuthProperties.PendingCleanup(true, java.time.Duration.ofHours(1), 1));
        var disabled = new com.homeservice.config.properties.AuthProperties(authProperties.otpTtl(), authProperties.otpResendInterval(),
                authProperties.otpMaxAttempts(), authProperties.pendingRegistrationTtl(),
                new com.homeservice.config.properties.AuthProperties.PendingCleanup(false, java.time.Duration.ofHours(1), 1));
        try {
            new com.homeservice.auth.job.PendingRegistrationCleanupJob(accounts, applications, cleanup, disabled, clock).run();
            assertThat(accounts.count()).isEqualTo(7);
            var job = new com.homeservice.auth.job.PendingRegistrationCleanupJob(accounts, applications, cleanup, enabled, clock);
            job.run();
            assertThat(accounts.findByEmail("a-blocked@example.com")).isPresent();
            assertThat(applications.existsById(pendingId)).isFalse();
            assertThat(challenges.existsById(pendingChallengeId)).isFalse();
            assertThat(identities.existsById("pending@cleanup.example.com")).isFalse();
            assertThat(challenges.existsById(blockedChallenge)).isTrue();
            assertThat(identities.existsById("a-blocked@example.com")).isTrue();
            assertThat(accounts.findByEmail("b-clean@example.com")).isEmpty();
            assertThat(accounts.findByEmail("c-clean@example.com")).isEmpty();
            for (String kind : List.of("active", "suspended", "provider", "admin"))
                assertThat(accounts.findByEmail(kind + "@protected.example.com")).isPresent();
            assertThat(identities.existsById("b-clean@example.com")).isFalse();
            assertThat(latestApplication().getStatus()).isEqualTo(ProviderApplicationStatus.PENDING_REVIEW);
            assertThat(applications.findFirstByEmailOrderByIdDesc("approved@protected.example.com").orElseThrow().getStatus()).isEqualTo(ProviderApplicationStatus.APPROVED);
            assertThat(applications.findFirstByEmailOrderByIdDesc("rejected@protected.example.com").orElseThrow().getStatus()).isEqualTo(ProviderApplicationStatus.REJECTED);
            job.run();
            assertThat(accounts.findByEmail("a-blocked@example.com")).isPresent();
        } finally {
            jdbc.update("delete from customer_addresses where customer_id = ?", blocked.getId());
        }
    }

    @Test
    void cleanupWaitsForVerifiedProviderAndPreservesCommittedApplication() throws Exception {
        Browser browser = submit();
        String code = sentCode();
        var verified = new java.util.concurrent.CountDownLatch(1);
        var release = new java.util.concurrent.CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var activation = pool.submit(() -> new org.springframework.transaction.support.TransactionTemplate(transactionManager).execute(tx -> {
                try {
                    status(browser.post(ROOT + "/verify-email", browser.verification(code)), 200);
                    verified.countDown();
                    if (!release.await(5, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("release timeout");
                    return null;
                } catch (Exception ex) { throw new RuntimeException(ex); }
            }));
            assertThat(verified.await(5, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            now = now.plusSeconds(86400);
            var cleaning = pool.submit(() -> cleanup.cleanupInNewTransaction(EMAIL));
            try { org.assertj.core.api.Assertions.assertThatThrownBy(() -> cleaning.get(200, java.util.concurrent.TimeUnit.MILLISECONDS))
                    .isInstanceOf(java.util.concurrent.TimeoutException.class); }
            finally { release.countDown(); }
            activation.get(5, java.util.concurrent.TimeUnit.SECONDS);
            assertThat(cleaning.get(5, java.util.concurrent.TimeUnit.SECONDS)).isZero();
        }
        assertThat(latestApplication().getStatus()).isEqualTo(ProviderApplicationStatus.PENDING_REVIEW);
    }

    @Test
    void cleanupSerializesWithCompetingExpiredProviderSubmissions() throws Exception {
        Browser old = submit();
        Long oldId = latestApplication().getId();
        String oldCode = sentCode();
        now = now.plusSeconds(86400);
        var locked = new java.util.concurrent.CountDownLatch(1);
        var release = new java.util.concurrent.CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(6)) {
            var firstCleanup = pool.submit(() -> new org.springframework.transaction.support.TransactionTemplate(transactionManager).execute(tx -> {
                identities.findByEmailForUpdate(EMAIL).orElseThrow();
                locked.countDown();
                try { if (!release.await(5, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("release timeout"); }
                catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw new RuntimeException(ex); }
                return cleanup.cleanupLocked(EMAIL);
            }));
            assertThat(locked.await(5, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            var first = pool.submit(() -> new Browser().post(ROOT, submission()).getResponse().getStatus());
            var second = pool.submit(() -> new Browser().post(ROOT, submission()).getResponse().getStatus());
            var otherCleanup = pool.submit(() -> cleanup.cleanupInNewTransaction(EMAIL));
            Browser verifier = new Browser(); verifier.token = old.token;
            Browser resender = new Browser(); resender.token = old.token;
            var verifyOld = pool.submit(() -> verifier.post(ROOT + "/verify-email", verifier.verification(oldCode)).getResponse().getStatus());
            var resendOld = pool.submit(() -> resender.post(ROOT + "/resend-verification", resender.resend()).getResponse().getStatus());
            try { org.assertj.core.api.Assertions.assertThatThrownBy(() -> first.get(200, java.util.concurrent.TimeUnit.MILLISECONDS))
                    .isInstanceOf(java.util.concurrent.TimeoutException.class); }
            finally { release.countDown(); }
            assertThat(firstCleanup.get(5, java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(1);
            var statuses = List.of(first.get(5, java.util.concurrent.TimeUnit.SECONDS), second.get(5, java.util.concurrent.TimeUnit.SECONDS));
            otherCleanup.get(5, java.util.concurrent.TimeUnit.SECONDS);
            assertThat(verifyOld.get(5, java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(400);
            assertThat(resendOld.get(5, java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(400);
            assertThat(statuses).contains(201).allMatch(value -> value == 201 || value == 409 || value == 429);
            assertThat(statuses.stream().filter(value -> value == 201).count()).isEqualTo(1);
        }
        assertThat(latestApplication().getId()).isNotEqualTo(oldId);
        assertThat(identities.count()).isEqualTo(1);
        assertThat(applications.count()).isEqualTo(1);
        assertThat(challenges.count()).isEqualTo(1);
    }

    @Test
    void customerAndProviderRaceAfterExpiryHasOnlyOneIdentity() throws Exception {
        for (String previousType : List.of("provider", "customer")) {
            resetData();
            if (previousType.equals("provider")) submit();
            else status(new Browser().post("/api/auth/register/customer", Map.of("email", EMAIL,
                    "password", "Password-123!", "displayName", "Khách")), 201);
            now = now.plusSeconds(86400);
            var locked = new java.util.concurrent.CountDownLatch(1);
            var release = new java.util.concurrent.CountDownLatch(1);
            try (var pool = Executors.newFixedThreadPool(3)) {
                var cleaning = pool.submit(() -> new org.springframework.transaction.support.TransactionTemplate(transactionManager).execute(tx -> {
                    identities.findByEmailForUpdate(EMAIL).orElseThrow();
                    locked.countDown();
                    try { if (!release.await(5, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("release timeout"); }
                    catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw new RuntimeException(ex); }
                    return cleanup.cleanupLocked(EMAIL);
                }));
                assertThat(locked.await(5, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
                var customer = pool.submit(() -> new Browser().post("/api/auth/register/customer", Map.of("email", EMAIL,
                        "password", "Password-123!", "displayName", "Khách")).getResponse().getStatus());
                var provider = pool.submit(() -> new Browser().post(ROOT, submission()).getResponse().getStatus());
                try { org.assertj.core.api.Assertions.assertThatThrownBy(() -> customer.get(200, java.util.concurrent.TimeUnit.MILLISECONDS))
                        .isInstanceOf(java.util.concurrent.TimeoutException.class); }
                finally { release.countDown(); }
                assertThat(cleaning.get(5, java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(1);
                assertThat(List.of(customer.get(5, java.util.concurrent.TimeUnit.SECONDS), provider.get(5, java.util.concurrent.TimeUnit.SECONDS)))
                        .containsExactlyInAnyOrder(201, 409);
            }
            assertThat(identities.count()).isEqualTo(1);
            assertThat(accounts.count() + applications.count()).isEqualTo(1);
            assertThat(challenges.count()).isEqualTo(1);
        }
    }

    private LinkedHashMap<String, String> submission() {
        return new LinkedHashMap<>(Map.of("email", EMAIL, "applicantName", " Người nộp hồ sơ ", "phone", "0901234567",
                "businessName", " Dịch vụ tại nhà ", "city", " Hà Nội ", "description", "Dọn dẹp và sửa chữa",
                "documentUrl", "https://drive.google.com/drive/folders/test-documents"));
    }

    private Browser submit() throws Exception {
        Browser browser = new Browser();
        status(browser.post(ROOT, submission()), 201);
        return browser;
    }

    private ProviderApplication latestApplication() {
        return applications.findFirstByEmailOrderByIdDesc(EMAIL).orElseThrow();
    }

    private EmailChallenge latestChallenge() {
        return challenges.findFirstByProviderApplicationIdAndPurposeOrderByIdDesc(latestApplication().getId(),
                EmailChallengePurpose.VERIFY_PROVIDER_APPLICATION).orElseThrow();
    }

    private String sentCode() {
        ArgumentCaptor<SimpleMailMessage> message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail, atLeastOnce()).send(message.capture());
        SimpleMailMessage last = message.getAllValues().getLast();
        assertThat(last.getTo()).containsExactly(EMAIL);
        assertThat(last.getSubject()).contains("hồ sơ nhà cung cấp");
        var matcher = Pattern.compile("[0-9]{6}").matcher(last.getText());
        assertThat(matcher.find()).isTrue();
        return matcher.group();
    }

    private JsonNode body(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString());
    }

    private void status(MvcResult result, int expected) throws Exception {
        assertThat(result.getResponse().getStatus()).as(result.getResponse().getContentAsString()).isEqualTo(expected);
    }

    private void error(MvcResult result, int expected, String code) throws Exception {
        status(result, expected);
        assertThat(body(result).get("code").asString()).isEqualTo(code);
    }

    private class Browser {
        final Map<String, Cookie> cookies = new LinkedHashMap<>();
        String token;

        Map<String, String> verification(String code) {
            return Map.of("email", EMAIL, "code", code, "registrationToken", token);
        }

        Map<String, String> resend() {
            return Map.of("email", EMAIL, "registrationToken", token);
        }

        MvcResult post(String path, Object payload) throws Exception {
            var csrfRequest = get("/api/auth/csrf");
            if (!cookies.isEmpty()) csrfRequest.cookie(cookies.values().toArray(Cookie[]::new));
            MvcResult csrf = mvc.perform(csrfRequest).andReturn();
            status(csrf, 200);
            for (Cookie cookie : csrf.getResponse().getCookies()) cookies.put(cookie.getName(), cookie);
            MvcResult result = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path)
                    .cookie(cookies.values().toArray(Cookie[]::new))
                    .header("Authorization", "Bearer expired").header("X-XSRF-TOKEN", body(csrf).get("token").asString())
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload))).andReturn();
            if ((path.equals(ROOT) && result.getResponse().getStatus() == 201)
                    || (path.equals(ROOT + "/resend-verification") && result.getResponse().getStatus() == 200)) {
                token = body(result).get("registrationToken").asString();
            }
            return result;
        }
    }
}
