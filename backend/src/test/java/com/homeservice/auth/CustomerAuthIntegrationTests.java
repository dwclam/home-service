package com.homeservice.auth;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.auth.entity.EmailChallenge;
import com.homeservice.auth.entity.EmailIdentity;
import com.homeservice.auth.enums.EmailChallengePurpose;
import com.homeservice.auth.repository.RefreshTokenRepository;
import com.homeservice.auth.repository.EmailChallengeRepository;
import com.homeservice.auth.repository.EmailIdentityRepository;
import com.homeservice.auth.service.TokenService;
import com.homeservice.auth.service.JwtTokenService;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.beans.factory.annotation.Qualifier;
import java.util.List;
import java.util.UUID;
import java.util.Base64;
import java.nio.charset.StandardCharsets;
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
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
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

@SpringBootTest(properties = {
        "app.auth.login-rate-limit.max-attempts-per-email-and-ip=100",
        "app.auth.login-rate-limit.max-attempts-per-ip=1000"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CustomerAuthIntegrationTests {
    private static final String EMAIL = "lam@example.com";
    private static final String PASSWORD = "Test-password-123!";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AccountRepository accounts;
    @Autowired EmailIdentityRepository identities;
    @Autowired EmailChallengeRepository challenges;
    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired PasswordEncoder passwords;
    @Autowired TokenService tokens;
    @Autowired JdbcTemplate jdbc;
    @Autowired JwtTokenService jwtTokens;
    @Autowired @Qualifier("accessJwtEncoder") JwtEncoder accessEncoder;
    @Autowired @Qualifier("accessJwtDecoder") JwtDecoder accessDecoder;
    @MockitoBean JavaMailSender mail;
    @MockitoBean Clock clock;

    Instant now;

    @BeforeEach
    void resetData() {
        refreshTokens.deleteAllInBatch();
        challenges.deleteAllInBatch();
        accounts.deleteAllInBatch();
        identities.deleteAllInBatch();
        now = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        when(clock.instant()).thenAnswer(invocation -> now);
    }

    @Test
    void completeCustomerFlowIssuesJwtPairAndLogoutRevokesRefresh() throws Exception {
        Browser browser = new Browser();
        MvcResult registered = browser.postJson("/register/customer", registration("  LAM@Example.COM  "));
        assertStatus(registered, 201);
        assertThat(body(registered).get("email").asString()).isEqualTo(EMAIL);
        Account account = accounts.findByEmail(EMAIL).orElseThrow();
        assertThat(account.getStatus()).isEqualTo(AccountStatus.PENDING_EMAIL);
        assertThat(account.getDisplayName()).isEqualTo("Lâm");
        assertThat(passwords.matches(PASSWORD, account.getPasswordHash())).isTrue();
        assertThat(account.getPasswordHash()).doesNotContain(PASSWORD);
        String code = sentCode();
        EmailChallenge challenge = latestChallenge();
        assertThat(challenge.getCodeHash()).doesNotContain(code);
        assertThat(passwords.matches(code, challenge.getCodeHash())).isTrue();
        assertThat(challenge.getExpiresAt()).isEqualTo(now.plus(Duration.ofMinutes(10)));
        assertThat(browser.registrationToken).matches("[A-Za-z0-9_-]{43}");
        assertThat(challenge.getRegistrationTokenHash())
                .isEqualTo(tokens.hashToken(browser.registrationToken)).isNotEqualTo(browser.registrationToken);
        assertThat(challenge.getCodeHash()).doesNotContain(browser.registrationToken);
        assertThat(registered.getResponse().getHeader("Cache-Control")).contains("no-store");

        MvcResult verified = browser.postJson("/verify-email", browser.verification(code));
        assertStatus(verified, 200);
        assertThat(body(verified).get("status").asString()).isEqualTo("ACTIVE");
        assertThat(latestChallenge().getConsumedAt()).isEqualTo(now);
        MvcResult loggedIn = browser.postJson("/login", login(EMAIL));
        assertStatus(loggedIn, 200);
        assertThat(body(loggedIn).get("account").get("accountType").asString()).isEqualTo("CUSTOMER");
        assertThat(loggedIn.getResponse().getContentAsString()).doesNotContain("passwordHash", "tokenHash", "\"token\"");
        Cookie refreshCookie = browser.cookies.get("NESTIFY_REFRESH");
        String token = refreshCookie.getValue();
        assertThat(refreshCookie.isHttpOnly()).isTrue();
        assertThat(refreshCookie.getSecure()).isFalse();
        assertThat(refreshCookie.getPath()).isEqualTo("/api/auth");
        assertThat(refreshCookie.getAttribute("SameSite")).isEqualTo("Lax");
        assertThat(refreshCookie.getMaxAge()).isEqualTo(14 * 24 * 60 * 60);
        assertThat(browser.cookies).doesNotContainKeys("JSESSIONID", "XSRF-TOKEN");
        assertThat(refreshTokens.findAll().getFirst().getTokenHash()).isEqualTo(tokens.hashToken(token)).isNotEqualTo(token);
        MvcResult me = browser.getPath("/api/auth/me");
        assertStatus(me, 200);
        assertThat(me.getResponse().getHeader("Cache-Control")).contains("no-store");
        assertStatus(browser.getPath("/api/admin/protected"), 403);
        assertStatus(browser.getPath("/api/provider/protected"), 403);

        String oldAccess = browser.accessToken;
        assertStatus(browser.postJson("/logout", Map.of()), 204);
        assertThat(browser.cookies).doesNotContainKey("NESTIFY_REFRESH");
        assertThat(refreshTokens.findAll().getFirst().getRevokedAt()).isEqualTo(now);
        assertStatus(browser.getPath("/api/auth/me"), 401);
        assertStatus(mvc.perform(get("/api/auth/me").cookie(new Cookie("NESTIFY_REFRESH", token))).andReturn(), 401);
        assertStatus(browser.postJson("/logout", Map.of()), 204);
        // Pure JWT access authentication remains valid until its own expiry.
        assertStatus(mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + oldAccess)).andReturn(), 200);
        browser.cookies.put("NESTIFY_REFRESH", new Cookie("NESTIFY_REFRESH", token));
        assertError(browser.postJson("/refresh", Map.of()), 401, "REFRESH_TOKEN_INVALID");
        assertThat(browser.cookies).doesNotContainKey("NESTIFY_REFRESH");
        now = now.plus(Duration.ofMinutes(15));
        assertStatus(mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + oldAccess)).andReturn(), 401);
    }

    @Test
    void reRegistrationReplacesOnlyPendingCredentialsAndInvalidatesOldTokens() throws Exception {
        Browser attacker = new Browser();
        register(attacker);
        String oldToken = attacker.registrationToken;
        String oldCode = sentCode();
        EmailChallenge originalChallenge = latestChallenge();
        Account original = accounts.findByEmail(EMAIL).orElseThrow();
        Browser owner = new Browser();
        var replacement = new LinkedHashMap<>(registration("LAM@EXAMPLE.COM"));
        replacement.put("password", "Owner-password-456!");
        replacement.put("displayName", " Owner ");
        replacement.put("phone", "0907654321");

        assertError(owner.postJson("/register/customer", replacement), 429, "OTP_RESEND_TOO_SOON");
        assertThat(accounts.findByEmail(EMAIL).orElseThrow().getPasswordHash()).isEqualTo(original.getPasswordHash());
        now = now.plusSeconds(60);
        assertStatus(owner.postJson("/register/customer", replacement), 201);
        String newCode = sentCode();
        assertThat(owner.registrationToken).isNotEqualTo(oldToken);
        assertThat(newCode).isNotEqualTo(oldCode);
        Account pending = accounts.findByEmail(EMAIL).orElseThrow();
        assertThat(pending.getId()).isEqualTo(original.getId());
        assertThat(pending.getStatus()).isEqualTo(AccountStatus.PENDING_EMAIL);
        assertThat(pending.getDisplayName()).isEqualTo("Owner");
        assertThat(pending.getPhone()).isEqualTo("0907654321");
        assertThat(passwords.matches("Owner-password-456!", pending.getPasswordHash())).isTrue();
        assertThat(passwords.matches(PASSWORD, pending.getPasswordHash())).isFalse();
        assertThat(challenges.findById(originalChallenge.getId()).orElseThrow().getInvalidatedAt()).isEqualTo(now);
        assertThat(accounts.count()).isEqualTo(1);
        assertThat(identities.count()).isEqualTo(1);

        assertError(attacker.postJson("/verify-email", attacker.verification(newCode)), 400, "REGISTRATION_INVALID");
        assertError(attacker.postJson("/verify-email", attacker.verification(oldCode)), 400, "REGISTRATION_INVALID");
        assertError(attacker.postJson("/resend-verification", attacker.resendPayload()), 400, "REGISTRATION_INVALID");
        assertThat(latestChallenge().getAttemptCount()).isZero();
        assertError(owner.postJson("/verify-email", owner.verification(oldCode)), 400, "OTP_INVALID");
        assertStatus(owner.postJson("/verify-email", owner.verification(newCode)), 200);
        assertError(attacker.postJson("/login", login(EMAIL)), 401, "INVALID_CREDENTIALS");
        assertStatus(owner.postJson("/login", Map.of("email", EMAIL, "password", "Owner-password-456!")), 200);
    }

    @Test
    void latestOtpCannotActivateAnAttackerPasswordFromAnEarlierOwnerForm() throws Exception {
        Browser owner = new Browser();
        register(owner);
        Browser attacker = new Browser();
        var replacement = new LinkedHashMap<>(registration(EMAIL));
        replacement.put("password", "Attacker-password-456!");
        now = now.plusSeconds(60);
        assertStatus(attacker.postJson("/register/customer", replacement), 201);

        // The owner reads the latest email, but their form belongs to the previous registration.
        assertError(owner.postJson("/verify-email", owner.verification(sentCode())), 400, "REGISTRATION_INVALID");
        assertError(owner.postJson("/resend-verification", owner.resendPayload()), 400, "REGISTRATION_INVALID");
        assertThat(latestChallenge().getAttemptCount()).isZero();
        assertThat(accounts.findByEmail(EMAIL).orElseThrow().getStatus()).isEqualTo(AccountStatus.PENDING_EMAIL);
        assertError(attacker.postJson("/login", Map.of("email", EMAIL, "password", "Attacker-password-456!")),
                403, "EMAIL_NOT_VERIFIED");

        now = now.plusSeconds(60);
        register(owner);
        activate(owner);
        assertStatus(owner.postJson("/login", login(EMAIL)), 200);
        assertError(attacker.postJson("/login", Map.of("email", EMAIL, "password", "Attacker-password-456!")),
                401, "INVALID_CREDENTIALS");
    }

    @Test
    void activeSuspendedAndOtherAccountTypesCannotBeOverwritten() throws Exception {
        Browser browser = new Browser();
        seedActiveAccount(EMAIL, AccountType.CUSTOMER);
        Account account = accounts.findByEmail(EMAIL).orElseThrow();
        String originalHash = account.getPasswordHash();
        var replacement = new LinkedHashMap<>(registration(EMAIL));
        replacement.put("password", "Replacement-password-456!");
        assertError(browser.postJson("/register/customer", replacement), 409, "EMAIL_ALREADY_USED");
        account.setStatus(AccountStatus.SUSPENDED);
        account.setSuspendedAt(now);
        account.setSuspensionReason("Test suspension");
        accounts.saveAndFlush(account);
        assertError(browser.postJson("/register/customer", replacement), 409, "EMAIL_ALREADY_USED");
        Account suspended = accounts.findByEmail(EMAIL).orElseThrow();
        assertThat(suspended.getStatus()).isEqualTo(AccountStatus.SUSPENDED);
        assertThat(suspended.getPasswordHash()).isEqualTo(originalHash);

        seedActiveAccount("provider@example.com", AccountType.PROVIDER);
        Account provider = accounts.findByEmail("provider@example.com").orElseThrow();
        provider.setStatus(AccountStatus.PENDING_EMAIL);
        provider.setEmailVerifiedAt(null);
        accounts.saveAndFlush(provider);
        assertError(browser.postJson("/register/customer", registration("provider@example.com")), 409, "EMAIL_ALREADY_USED");
        assertThat(accounts.findByEmail("provider@example.com").orElseThrow().getAccountType()).isEqualTo(AccountType.PROVIDER);

        identities.saveAndFlush(new EmailIdentity("reserved@example.com", AccountType.PROVIDER));
        assertError(browser.postJson("/register/customer", registration("reserved@example.com")), 409, "EMAIL_ALREADY_USED");
        assertThat(identities.findById("reserved@example.com").orElseThrow().getAccountType()).isEqualTo(AccountType.PROVIDER);
        assertThat(challenges.count()).isZero();
    }

    @Test
    void pendingSuspendedUnknownWrongPasswordAndWrongRoleCannotLogin() throws Exception {
        Browser browser = new Browser();
        register(browser);
        assertError(browser.postJson("/login", login(EMAIL)), 403, "EMAIL_NOT_VERIFIED");
        assertError(browser.postJson("/login", Map.of("email", EMAIL, "password", "wrong-password")), 401, "INVALID_CREDENTIALS");
        assertError(browser.postJson("/login", login("unknown@example.com")), 401, "INVALID_CREDENTIALS");
        activate(browser);
        Account account = accounts.findByEmail(EMAIL).orElseThrow();
        account.setStatus(AccountStatus.SUSPENDED);
        account.setSuspendedAt(now);
        account.setSuspensionReason("Test suspension");
        accounts.saveAndFlush(account);
        assertError(browser.postJson("/login", login(EMAIL)), 403, "ACCOUNT_SUSPENDED");

        seedActiveAccount("provider@example.com", AccountType.PROVIDER);
        assertError(browser.postJson("/login", login("provider@example.com")), 401, "INVALID_CREDENTIALS");
        seedActiveAccount("admin@example.com", AccountType.ADMIN);
        assertError(browser.postJson("/login", login("admin@example.com")), 401, "INVALID_CREDENTIALS");
        assertThat(refreshTokens.count()).isZero();
    }

    @Test
    void wrongOtpAttemptsCommitAndFifthAttemptInvalidatesChallenge() throws Exception {
        Browser browser = new Browser();
        register(browser);
        String correct = sentCode();
        String wrong = wrongCode(correct);
        for (int attempt = 1; attempt <= 5; attempt++) {
            assertError(browser.postJson("/verify-email", browser.verification(wrong)),
                    attempt < 5 ? 400 : 429, attempt < 5 ? "OTP_INVALID" : "OTP_ATTEMPTS_EXCEEDED");
            assertThat(latestChallenge().getAttemptCount()).isEqualTo(attempt);
        }
        assertThat(latestChallenge().getInvalidatedAt()).isEqualTo(now);
        assertError(browser.postJson("/verify-email", browser.verification(correct)), 429, "OTP_ATTEMPTS_EXCEEDED");
        assertThat(accounts.findByEmail(EMAIL).orElseThrow().getStatus()).isEqualTo(AccountStatus.PENDING_EMAIL);
    }

    @Test
    void resendHonorsSixtySecondsAndReplacesOldCodeForSameAccount() throws Exception {
        Browser browser = new Browser();
        register(browser);
        String oldCode = sentCode();
        String registrationToken = browser.registrationToken;
        Long oldId = latestChallenge().getId();
        assertError(browser.postJson("/resend-verification", browser.resendPayload()), 429, "OTP_RESEND_TOO_SOON");
        now = now.plusSeconds(59);
        assertError(browser.postJson("/resend-verification", browser.resendPayload()), 429, "OTP_RESEND_TOO_SOON");
        now = now.plusSeconds(1);
        assertStatus(browser.postJson("/resend-verification", browser.resendPayload()), 200);
        String newCode = sentCode();
        assertThat(browser.registrationToken).isEqualTo(registrationToken);
        assertThat(newCode).isNotEqualTo(oldCode);
        assertThat(challenges.findById(oldId).orElseThrow().getInvalidatedAt()).isEqualTo(now);
        assertThat(accounts.count()).isEqualTo(1);
        assertThat(challenges.count()).isEqualTo(2);
        assertError(browser.postJson("/verify-email", browser.verification(oldCode)), 400, "OTP_INVALID");
        assertStatus(browser.postJson("/verify-email", browser.verification(newCode)), 200);
        assertError(browser.postJson("/verify-email", browser.verification(newCode)), 400, "VERIFICATION_NOT_AVAILABLE");
    }

    @Test
    void expiredUnsentAndOtherPurposeCodesCannotActivateAccount() throws Exception {
        Browser browser = new Browser();
        register(browser);
        String code = sentCode();
        now = now.plus(Duration.ofMinutes(10));
        assertError(browser.postJson("/verify-email", browser.verification(code)), 400, "OTP_INVALID");
        assertThat(accounts.findByEmail(EMAIL).orElseThrow().getStatus()).isEqualTo(AccountStatus.PENDING_EMAIL);

        EmailChallenge challenge = latestChallenge();
        challenge.setExpiresAt(now.plusSeconds(100));
        challenge.setSentAt(null);
        challenges.saveAndFlush(challenge);
        assertError(browser.postJson("/verify-email", browser.verification(code)), 400, "OTP_INVALID");
        challenge.setSentAt(now);
        challenge.setPurpose(EmailChallengePurpose.RESET_PASSWORD);
        challenges.saveAndFlush(challenge);
        assertError(browser.postJson("/verify-email", browser.verification(code)), 400, "OTP_INVALID");
    }

    @Test
    void smtpFailureRollsBackRegistrationAndFailedResendPreservesOldCode() throws Exception {
        Browser browser = new Browser();
        doThrow(new MailSendException("test-only failure")).when(mail).send(any(SimpleMailMessage.class));
        assertError(browser.postJson("/register/customer", registration(EMAIL)), 503, "EMAIL_DELIVERY_FAILED");
        assertThat(accounts.count()).isZero();
        assertThat(identities.count()).isZero();
        assertThat(challenges.count()).isZero();

        reset(mail);
        register(browser);
        String code = sentCode();
        Long challengeId = latestChallenge().getId();
        now = now.plusSeconds(60);
        doThrow(new MailSendException("test-only failure")).when(mail).send(any(SimpleMailMessage.class));
        assertError(browser.postJson("/resend-verification", browser.resendPayload()), 503, "EMAIL_DELIVERY_FAILED");
        assertThat(challenges.count()).isEqualTo(1);
        assertThat(challenges.findById(challengeId).orElseThrow().getInvalidatedAt()).isNull();
        assertStatus(browser.postJson("/verify-email", browser.verification(code)), 200);
    }

    @Test
    void verifyAndResendRejectMissingMalformedForeignAndCrossAccountTokens() throws Exception {
        Browser browser = new Browser();
        register(browser);
        String code = sentCode();
        assertError(browser.postJson("/verify-email", Map.of("email", EMAIL, "code", code)),
                400, "VALIDATION_ERROR");
        assertError(browser.postJson("/resend-verification", Map.of("email", EMAIL)),
                400, "VALIDATION_ERROR");
        for (String token : List.of("", "too-short", "!".repeat(43), tokens.generateRandomValue())) {
            String error = token.matches("[A-Za-z0-9_-]{43}") ? "REGISTRATION_INVALID" : "VALIDATION_ERROR";
            assertError(browser.postJson("/verify-email",
                    Map.of("email", EMAIL, "code", code, "registrationToken", token)), 400, error);
            assertError(browser.postJson("/resend-verification",
                    Map.of("email", EMAIL, "registrationToken", token)), 400, error);
        }

        Browser other = new Browser();
        assertStatus(other.postJson("/register/customer", registration("other@example.com")), 201);
        assertError(browser.postJson("/verify-email", Map.of("email", EMAIL, "code", code,
                "registrationToken", other.registrationToken)), 400, "REGISTRATION_INVALID");
        assertError(browser.postJson("/resend-verification", Map.of("email", EMAIL,
                "registrationToken", other.registrationToken)), 400, "REGISTRATION_INVALID");
        assertThat(latestChallenge().getAttemptCount()).isZero();
        assertThat(challenges.count()).isEqualTo(2);
        assertStatus(browser.postJson("/verify-email", browser.verification(code)), 200);
    }

    @Test
    void failedReRegistrationPreservesOriginalCredentialsOtpAndToken() throws Exception {
        Browser browser = new Browser();
        register(browser);
        String code = sentCode();
        String originalHash = accounts.findByEmail(EMAIL).orElseThrow().getPasswordHash();
        now = now.plusSeconds(60);
        var replacement = new LinkedHashMap<>(registration(EMAIL));
        replacement.put("password", "Replacement-password-456!");
        replacement.put("displayName", "Replacement");
        doThrow(new MailSendException("test-only failure")).when(mail).send(any(SimpleMailMessage.class));

        assertError(browser.postJson("/register/customer", replacement), 503, "EMAIL_DELIVERY_FAILED");
        Account account = accounts.findByEmail(EMAIL).orElseThrow();
        assertThat(account.getPasswordHash()).isEqualTo(originalHash);
        assertThat(account.getDisplayName()).isEqualTo("Lâm");
        assertThat(challenges.count()).isEqualTo(1);
        assertThat(latestChallenge().getInvalidatedAt()).isNull();
        assertStatus(browser.postJson("/verify-email", browser.verification(code)), 200);
    }

    @Test
    void legacyChallengeWithoutTokenRequiresStartingRegistrationAgain() throws Exception {
        Browser browser = new Browser();
        register(browser);
        String oldCode = sentCode();
        jdbc.update("update email_challenges set registration_token_hash = null where id = ?", latestChallenge().getId());
        assertError(browser.postJson("/verify-email", browser.verification(oldCode)), 400, "REGISTRATION_INVALID");
        assertError(browser.postJson("/resend-verification", browser.resendPayload()), 400, "REGISTRATION_INVALID");
        now = now.plusSeconds(60);
        register(browser);
        activate(browser);
        assertThat(accounts.count()).isEqualTo(1);
    }

    @Test
    void expiredOtpCanBeResentOnlyWithTheCurrentRegistrationToken() throws Exception {
        Browser browser = new Browser();
        register(browser);
        String oldToken = browser.registrationToken;
        now = now.plus(Duration.ofMinutes(10));
        assertStatus(browser.postJson("/resend-verification", browser.resendPayload()), 200);
        assertThat(browser.registrationToken).isEqualTo(oldToken);
        assertThat(latestChallenge().getExpiresAt()).isEqualTo(now.plus(Duration.ofMinutes(10)));
        activate(browser);
    }

    @Test
    void exhaustedOtpCanBeResentWithinTheSameRegistration() throws Exception {
        Browser browser = new Browser();
        register(browser);
        String wrong = wrongCode(sentCode());
        for (int i = 0; i < 5; i++) browser.postJson("/verify-email", browser.verification(wrong));
        now = now.plusSeconds(60);
        assertStatus(browser.postJson("/resend-verification", browser.resendPayload()), 200);
        assertThat(latestChallenge().getAttemptCount()).isZero();
        activate(browser);
    }

    @Test
    void concurrentReRegistrationsCannotMixCredentialsAndTokens() throws Exception {
        Browser browser = new Browser();
        register(browser);
        now = now.plusSeconds(60);
        String csrf = browser.refreshCsrf();
        Cookie[] cookies = browser.cookieArray();
        var first = new LinkedHashMap<>(registration(EMAIL));
        first.put("password", "First-password-456!");
        var second = new LinkedHashMap<>(registration(EMAIL));
        second.put("password", "Second-password-456!");
        String firstBody = json.writeValueAsString(first);
        String secondBody = json.writeValueAsString(second);
        try (var executor = Executors.newFixedThreadPool(2)) {
            Callable<MvcResult> one = () -> mvc.perform(post("/api/auth/register/customer").cookie(cookies)
                    .header("X-XSRF-TOKEN", csrf).contentType(MediaType.APPLICATION_JSON).content(firstBody)).andReturn();
            Callable<MvcResult> two = () -> mvc.perform(post("/api/auth/register/customer").cookie(cookies)
                    .header("X-XSRF-TOKEN", csrf).contentType(MediaType.APPLICATION_JSON).content(secondBody)).andReturn();
            var results = executor.invokeAll(List.of(one, two));
            MvcResult firstResult = results.get(0).get();
            MvcResult secondResult = results.get(1).get();
            assertThat(List.of(firstResult.getResponse().getStatus(), secondResult.getResponse().getStatus()))
                    .containsExactlyInAnyOrder(201, 429);
            MvcResult success = firstResult.getResponse().getStatus() == 201 ? firstResult : secondResult;
            String winningPassword = firstResult.getResponse().getStatus() == 201
                    ? "First-password-456!" : "Second-password-456!";
            assertStatus(browser.postJson("/verify-email", Map.of("email", EMAIL, "code", sentCode(),
                    "registrationToken", body(success).get("registrationToken").asString())), 200);
            assertStatus(browser.postJson("/login", Map.of("email", EMAIL, "password", winningPassword)), 200);
        }
        assertThat(accounts.count()).isEqualTo(1);
        assertThat(challenges.count()).isEqualTo(2);
    }

    @Test
    void reRegistrationRacingVerificationCannotActivateReplacedCredentials() throws Exception {
        Browser browser = new Browser();
        register(browser);
        String verification = json.writeValueAsString(browser.verification(sentCode()));
        var replacement = new LinkedHashMap<>(registration(EMAIL));
        replacement.put("password", "Replacement-password-456!");
        String replacementBody = json.writeValueAsString(replacement);
        now = now.plusSeconds(60);
        String csrf = browser.refreshCsrf();
        Cookie[] cookies = browser.cookieArray();
        try (var executor = Executors.newFixedThreadPool(2)) {
            Callable<MvcResult> verifyCall = () -> mvc.perform(post("/api/auth/verify-email").cookie(cookies)
                    .header("X-XSRF-TOKEN", csrf).contentType(MediaType.APPLICATION_JSON).content(verification)).andReturn();
            Callable<MvcResult> registerCall = () -> mvc.perform(post("/api/auth/register/customer").cookie(cookies)
                    .header("X-XSRF-TOKEN", csrf).contentType(MediaType.APPLICATION_JSON).content(replacementBody)).andReturn();
            var results = executor.invokeAll(List.of(verifyCall, registerCall));
            MvcResult verified = results.get(0).get();
            MvcResult registered = results.get(1).get();
            Account account = accounts.findByEmail(EMAIL).orElseThrow();
            if (verified.getResponse().getStatus() == 200) {
                assertError(registered, 409, "EMAIL_ALREADY_USED");
                assertThat(account.getStatus()).isEqualTo(AccountStatus.ACTIVE);
                assertThat(passwords.matches(PASSWORD, account.getPasswordHash())).isTrue();
            } else {
                assertError(verified, 400, "REGISTRATION_INVALID");
                assertStatus(registered, 201);
                assertThat(account.getStatus()).isEqualTo(AccountStatus.PENDING_EMAIL);
                assertThat(passwords.matches("Replacement-password-456!", account.getPasswordHash())).isTrue();
            }
        }
    }

    @Test
    void refreshRotatesOnceAndReplayRevokesDescendantsButNotOtherBrowsers() throws Exception {
        Browser browser = loggedInBrowser();
        Browser independent = new Browser();
        assertStatus(independent.postJson("/login", login(EMAIL)), 200);
        String first = browser.cookies.get("NESTIFY_REFRESH").getValue();
        Instant deadline = jwtTokens.decodeRefresh(first).getExpiresAt();
        now = now.plusSeconds(900);
        assertStatus(browser.getPath("/api/auth/me"), 401);
        assertStatus(browser.postJson("/refresh", Map.of()), 200);
        String second = browser.cookies.get("NESTIFY_REFRESH").getValue();
        assertThat(second).isNotEqualTo(first);
        assertThat(jwtTokens.decodeRefresh(second).getExpiresAt()).isEqualTo(deadline);
        assertThat(browser.cookies.get("NESTIFY_REFRESH").getMaxAge()).isEqualTo(14 * 86400 - 900);
        assertStatus(browser.getPath("/api/auth/me"), 200);
        browser.cookies.put("NESTIFY_REFRESH", new Cookie("NESTIFY_REFRESH", first));
        assertError(browser.postJson("/refresh", Map.of()), 401, "REFRESH_TOKEN_REUSED");
        browser.cookies.put("NESTIFY_REFRESH", new Cookie("NESTIFY_REFRESH", second));
        assertError(browser.postJson("/refresh", Map.of()), 401, "REFRESH_TOKEN_INVALID");
        assertStatus(independent.postJson("/refresh", Map.of()), 200);
    }

    @Test
    void suspensionBlocksRefreshButIssuedAccessExpiresNaturally() throws Exception {
        Browser browser = loggedInBrowser();
        Account account = accounts.findByEmail(EMAIL).orElseThrow();
        account.setStatus(AccountStatus.SUSPENDED);
        account.setSuspendedAt(now);
        account.setSuspensionReason("Test suspension");
        accounts.saveAndFlush(account);
        assertStatus(browser.getPath("/api/auth/me"), 200);
        assertError(browser.postJson("/refresh", Map.of()), 401, "REFRESH_TOKEN_INVALID");
        assertThat(refreshTokens.findAll()).allSatisfy(token -> assertThat(token.getRevokedAt()).isNotNull());
        now = now.plusSeconds(900);
        assertStatus(browser.getPath("/api/auth/me"), 401);
    }

    @Test
    void loggingInAgainRevokesPreviousRefreshForThisBrowser() throws Exception {
        Browser browser = loggedInBrowser();
        String oldToken = browser.cookies.get("NESTIFY_REFRESH").getValue();
        assertStatus(browser.postJson("/login", login(EMAIL)), 200);
        String newToken = browser.cookies.get("NESTIFY_REFRESH").getValue();
        assertThat(newToken).isNotEqualTo(oldToken);
        assertThat(refreshTokens.findById(UUID.fromString(jwtTokens.decodeRefresh(oldToken).getId()))
                .orElseThrow().getRevokedAt()).isEqualTo(now);
        browser.cookies.put("NESTIFY_REFRESH", new Cookie("NESTIFY_REFRESH", oldToken));
        assertError(browser.postJson("/refresh", Map.of()), 401, "REFRESH_TOKEN_INVALID");
        browser.cookies.put("NESTIFY_REFRESH", new Cookie("NESTIFY_REFRESH", newToken));
        assertStatus(browser.postJson("/refresh", Map.of()), 200);
    }

    @Test
    void expiredRefreshCannotExtendAbsoluteFourteenDayLimit() throws Exception {
        Browser browser = loggedInBrowser();
        now = now.plus(Duration.ofDays(14));
        assertError(browser.postJson("/refresh", Map.of()), 401, "REFRESH_TOKEN_INVALID");
    }

    @Test
    void accessAndRefreshAreJwtWithoutSidAndCannotBeSubstituted() throws Exception {
        Browser browser = loggedInBrowser();
        String access = browser.accessToken;
        String refresh = browser.cookies.get("NESTIFY_REFRESH").getValue();
        Jwt decodedAccess = accessDecoder.decode(access);
        Jwt decodedRefresh = jwtTokens.decodeRefresh(refresh);
        assertThat(access.split("\\.")).hasSize(3);
        assertThat(refresh.split("\\.")).hasSize(3);
        assertThat(decodedAccess.getClaims()).doesNotContainKeys("sid", "family_id");
        assertThat(decodedRefresh.getClaims()).doesNotContainKeys("sid", "family_id", "role");
        assertThat(decodedAccess.getId()).isNotEqualTo(decodedRefresh.getId());
        assertThat(decodedAccess.getClaimAsString("token_use")).isEqualTo("access");
        assertThat(decodedRefresh.getClaimAsString("token_use")).isEqualTo("refresh");
        assertStatus(mvc.perform(get("/api/auth/me").cookie(new Cookie("NESTIFY_REFRESH", refresh))).andReturn(), 401);
        assertStatus(mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + refresh)).andReturn(), 401);
        browser.cookies.put("NESTIFY_REFRESH", new Cookie("NESTIFY_REFRESH", access));
        assertError(browser.postJson("/refresh", Map.of()), 401, "REFRESH_TOKEN_INVALID");
        // An old opaque cookie no longer authenticates any request.
        assertStatus(mvc.perform(get("/api/auth/me").cookie(new Cookie("NESTIFY_SESSION", tokens.generateRandomValue())))
                .andReturn(), 401);
    }

    @Test
    void alteredSignatureIssuerAudienceTypeAndMissingClaimsAreRejected() throws Exception {
        Browser browser = loggedInBrowser();
        Jwt valid = accessDecoder.decode(browser.accessToken);
        String[] parts = browser.accessToken.split("\\.");
        String changedPayload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8)
                .replace("CUSTOMER", "ADMIN");
        String tampered = parts[0] + "." + Base64.getUrlEncoder().withoutPadding()
                .encodeToString(changedPayload.getBytes(StandardCharsets.UTF_8)) + "." + parts[2];
        assertStatus(mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + tampered)).andReturn(), 401);
        for (String field : List.of("iss", "aud", "token_use", "sub", "exp", "iat", "jti", "role")) {
            var claims = new LinkedHashMap<>(valid.getClaims());
            switch (field) {
                case "iss" -> claims.put(field, "wrong-issuer");
                case "aud" -> claims.put(field, List.of("wrong-audience"));
                case "token_use" -> claims.put(field, "refresh");
                case "sub" -> claims.put(field, "not-an-id");
                case "role" -> claims.put(field, "UNKNOWN");
                default -> claims.remove(field);
            }
            String invalid = accessEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),
                    JwtClaimsSet.builder().claims(map -> map.putAll(claims)).build())).getTokenValue();
            assertStatus(mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + invalid)).andReturn(), 401);
        }
        // A signed refresh token that was never issued/persisted is not accepted either.
        String untracked = jwtTokens.issueRefresh(accounts.findByEmail(EMAIL).orElseThrow().getId(),
                UUID.randomUUID(), now.plusSeconds(100)).getTokenValue();
        browser.cookies.put("NESTIFY_REFRESH", new Cookie("NESTIFY_REFRESH", untracked));
        assertError(browser.postJson("/refresh", Map.of()), 401, "REFRESH_TOKEN_INVALID");
    }

    @Test
    void concurrentRefreshReuseRevokesTheReplacement() throws Exception {
        Browser browser = loggedInBrowser();
        String csrf = browser.refreshCsrf();
        Cookie[] cookies = browser.cookieArray();
        try (var executor = Executors.newFixedThreadPool(2)) {
            Callable<MvcResult> task = () -> mvc.perform(post("/api/auth/refresh").cookie(cookies)
                    .header("X-XSRF-TOKEN", csrf)).andReturn();
            var futures = executor.invokeAll(List.of(task, task));
            MvcResult first = futures.get(0).get();
            MvcResult second = futures.get(1).get();
            assertThat(List.of(first.getResponse().getStatus(), second.getResponse().getStatus()))
                    .containsExactlyInAnyOrder(200, 401);
            MvcResult success = first.getResponse().getStatus() == 200 ? first : second;
            browser.cookies.put("NESTIFY_REFRESH", success.getResponse().getCookie("NESTIFY_REFRESH"));
            assertError(browser.postJson("/refresh", Map.of()), 401, "REFRESH_TOKEN_INVALID");
        }
    }

    @Test
    void bearerHeaderCannotBypassCsrfOnCookieEndpoints() throws Exception {
        Browser browser = loggedInBrowser();
        for (String path : List.of("/refresh", "/logout", "/login")) {
            assertError(mvc.perform(post("/api/auth" + path).cookie(browser.cookieArray())
                    .header("Authorization", "Bearer " + browser.accessToken)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(login(EMAIL))))
                    .andReturn(), 403, "CSRF_INVALID");
        }
        assertStatus(browser.getPath("/api/v1/admin/protected"), 403);
        assertStatus(browser.getPath("/api/v1/provider/protected"), 403);
    }

    private Browser loggedInBrowser() throws Exception {
        Browser browser = new Browser();
        register(browser);
        activate(browser);
        assertStatus(browser.postJson("/login", login(EMAIL)), 200);
        return browser;
    }

    @Test
    void concurrentWrongGuessesCannotBypassAttemptLimit() throws Exception {
        Browser browser = new Browser();
        register(browser);
        String wrong = wrongCode(sentCode());
        String csrf = browser.refreshCsrf();
        Cookie[] cookies = browser.cookieArray();
        String content = json.writeValueAsString(browser.verification(wrong));
        try (var executor = Executors.newFixedThreadPool(6)) {
            var tasks = IntStream.range(0, 6).mapToObj(i -> (Callable<Integer>) () -> mvc.perform(
                    post("/api/auth/verify-email").cookie(cookies).header("X-XSRF-TOKEN", csrf)
                            .contentType(MediaType.APPLICATION_JSON).content(content)).andReturn().getResponse().getStatus()).toList();
            var statuses = executor.invokeAll(tasks).stream().map(future -> {
                try { return future.get(); } catch (Exception exception) { throw new AssertionError(exception); }
            }).toList();
            assertThat(statuses).containsOnly(400, 429);
            assertThat(statuses.stream().filter(status -> status == 400).count()).isEqualTo(4);
        }
        assertThat(latestChallenge().getAttemptCount()).isEqualTo(5);
    }

    @Test
    void registrationEnforcesValidationCsrfAndServerAssignedCustomerRole() throws Exception {
        for (String path : new String[]{"/register/customer", "/verify-email", "/resend-verification", "/login", "/logout", "/refresh"}) {
            assertError(mvc.perform(post("/api/auth" + path).contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andReturn(), 403, "CSRF_INVALID");
        }
        Browser browser = new Browser();
        assertError(browser.postJson("/register/customer", registration("invalid-email")), 400, "VALIDATION_ERROR");
        var tooLong = new LinkedHashMap<>(registration(EMAIL));
        tooLong.put("password", "ấ".repeat(25));
        assertError(browser.postJson("/register/customer", tooLong), 400, "PASSWORD_TOO_LONG");
        var roleEscalation = new LinkedHashMap<>(registration(EMAIL));
        roleEscalation.put("accountType", "ADMIN");
        MvcResult result = browser.postJson("/register/customer", roleEscalation);
        // Unknown input fields may be ignored by Jackson; they must never control the role.
        assertThat(result.getResponse().getStatus()).isIn(201, 400);
        accounts.findByEmail(EMAIL).ifPresent(account -> assertThat(account.getAccountType()).isEqualTo(AccountType.CUSTOMER));
    }

    private Map<String, String> registration(String email) {
        return Map.of("email", email, "password", PASSWORD, "displayName", "  Lâm  ", "phone", "0901234567");
    }

    private Map<String, String> login(String email) {
        return Map.of("email", email, "password", PASSWORD);
    }

    private void register(Browser browser) throws Exception {
        assertStatus(browser.postJson("/register/customer", registration(EMAIL)), 201);
    }

    private void activate(Browser browser) throws Exception {
        assertStatus(browser.postJson("/verify-email", browser.verification(sentCode())), 200);
    }

    private String sentCode() {
        ArgumentCaptor<SimpleMailMessage> message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail, atLeastOnce()).send(message.capture());
        SimpleMailMessage last = message.getAllValues().getLast();
        assertThat(last.getTo()).containsExactly(EMAIL);
        var matcher = Pattern.compile("[0-9]{6}").matcher(last.getText());
        assertThat(matcher.find()).isTrue();
        return matcher.group();
    }

    private String wrongCode(String correct) {
        return "000000".equals(correct) ? "000001" : "000000";
    }

    private EmailChallenge latestChallenge() {
        return challenges.findFirstByAccountIdAndPurposeOrderByIdDesc(accounts.findByEmail(EMAIL).orElseThrow().getId(),
                EmailChallengePurpose.REGISTER_CUSTOMER).orElseThrow();
    }

    private void seedActiveAccount(String email, AccountType type) {
        identities.saveAndFlush(new EmailIdentity(email, type));
        Account account = new Account();
        account.setEmail(email);
        account.setAccountType(type);
        account.setDisplayName("Test account");
        account.setPasswordHash(passwords.encode(PASSWORD));
        account.setStatus(AccountStatus.ACTIVE);
        account.setEmailVerifiedAt(now);
        accounts.saveAndFlush(account);
    }

    private tools.jackson.databind.JsonNode body(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString());
    }

    private void assertStatus(MvcResult result, int status) throws Exception {
        assertThat(result.getResponse().getStatus()).as(result.getResponse().getContentAsString()).isEqualTo(status);
    }

    private void assertError(MvcResult result, int status, String code) throws Exception {
        assertStatus(result, status);
        assertThat(body(result).get("code").asString()).isEqualTo(code);
    }

    private class Browser {
        final Map<String, Cookie> cookies = new LinkedHashMap<>();
        String accessToken;
        String registrationToken;

        Map<String, String> verification(String code) {
            return Map.of("email", EMAIL, "code", code, "registrationToken", registrationToken);
        }

        Map<String, String> resendPayload() {
            return Map.of("email", EMAIL, "registrationToken", registrationToken);
        }

        Cookie[] cookieArray() {
            return cookies.values().toArray(Cookie[]::new);
        }

        String refreshCsrf() throws Exception {
            MvcResult result = getPath("/api/auth/csrf");
            assertStatus(result, 200);
            return body(result).get("token").asString();
        }

        MvcResult postJson(String path, Object payload) throws Exception {
            String csrf = refreshCsrf();
            MvcResult result = mvc.perform(post("/api/auth" + path).cookie(cookieArray())
                    .header("X-XSRF-TOKEN", csrf).contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(payload))).andReturn();
            acceptCookies(result);
            if ((path.equals("/register/customer") && result.getResponse().getStatus() == 201)
                    || (path.equals("/resend-verification") && result.getResponse().getStatus() == 200)) {
                registrationToken = body(result).get("registrationToken").asString();
            }
            if ((path.equals("/login") || path.equals("/refresh")) && result.getResponse().getStatus() == 200) {
                accessToken = body(result).get("accessToken").asString();
            }
            if (path.equals("/logout") && result.getResponse().getStatus() == 204) accessToken = null;
            return result;
        }

        MvcResult getPath(String path) throws Exception {
            var request = get(path);
            if (accessToken != null && !path.equals("/api/auth/csrf")) request.header("Authorization", "Bearer " + accessToken);
            if (!cookies.isEmpty()) request.cookie(cookieArray());
            MvcResult result = mvc.perform(request).andReturn();
            acceptCookies(result);
            return result;
        }

        void acceptCookies(MvcResult result) {
            for (Cookie cookie : result.getResponse().getCookies()) {
                if (cookie.getMaxAge() == 0) cookies.remove(cookie.getName());
                else cookies.put(cookie.getName(), cookie);
            }
        }
    }
}
