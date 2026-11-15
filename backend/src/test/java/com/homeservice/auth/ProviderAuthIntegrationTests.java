package com.homeservice.auth;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.auth.entity.EmailIdentity;
import com.homeservice.auth.entity.RefreshToken;
import com.homeservice.auth.repository.EmailIdentityRepository;
import com.homeservice.auth.repository.RefreshTokenRepository;
import com.homeservice.auth.service.JwtTokenService;
import com.homeservice.auth.service.RefreshTokenService;
import com.homeservice.provider.entity.ProviderApplication;
import com.homeservice.provider.entity.ProviderProfile;
import com.homeservice.provider.enums.CredentialsEmailStatus;
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
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;

import static com.homeservice.account.enums.AccountStatus.ACTIVE;
import static com.homeservice.account.enums.AccountStatus.PENDING_EMAIL;
import static com.homeservice.account.enums.AccountStatus.SUSPENDED;
import static com.homeservice.account.enums.AccountType.ADMIN;
import static com.homeservice.account.enums.AccountType.CUSTOMER;
import static com.homeservice.account.enums.AccountType.PROVIDER;
import static com.homeservice.provider.enums.CredentialsEmailStatus.FAILED;
import static com.homeservice.provider.enums.CredentialsEmailStatus.SENT;
import static com.homeservice.provider.enums.CredentialsEmailStatus.UNCONFIRMED;
import static com.homeservice.provider.enums.ProviderApplicationStatus.APPROVED;
import static com.homeservice.provider.enums.ProviderApplicationStatus.PENDING_REVIEW;
import static com.homeservice.security.RefreshTokenCookieService.COOKIE_NAME;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:nestify-provider-auth;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=15000",
        "app.auth.login-rate-limit.max-attempts-per-email-and-ip=4",
        "app.auth.login-rate-limit.max-attempts-per-ip=12",
        "app.auth.login-rate-limit.window=1m"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProviderAuthIntegrationTests {
    private static final String AUTH = "/api/auth";
    private static final String LOGIN = AUTH + "/login/provider";
    private static final String FIRST_PASSWORD = AUTH + "/provider/first-password";
    private static final String REFRESH = AUTH + "/refresh";
    private static final String LOGOUT = AUTH + "/logout";
    private static final String ADMIN_APPLICATIONS = "/api/admin/provider-applications";
    private static final String CSRF_COOKIE = "XSRF-TOKEN";
    private static final String EMAIL = "provider@example.test";
    private static final String TEMPORARY_PASSWORD = "FixtureTempPassword-01";
    private static final String NEW_PASSWORD = "FixtureNewPassword-01";
    private static final String OTHER_PASSWORD = "FixtureOtherPassword-01";
    private static final Instant NOW = Instant.parse("2026-11-13T02:30:00Z");
    private static final AtomicInteger CLIENTS = new AtomicInteger();
    private static final Pattern MAILED_PASSWORD = Pattern.compile("(?m)^Mật khẩu tạm: ([A-Za-z0-9_-]{43})$");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired AccountRepository accounts;
    @Autowired EmailIdentityRepository identities;
    @Autowired ProviderApplicationRepository applications;
    @Autowired ProviderProfileRepository profiles;
    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired RefreshTokenService refreshService;
    @Autowired JwtTokenService jwt;
    @Autowired TransactionTemplate transactions;
    @MockitoSpyBean PasswordEncoder passwords;
    @MockitoBean JavaMailSender mail;
    @MockitoBean Clock clock;

    private Instant now;
    private Account admin;

    @BeforeEach
    void setUp() {
        jdbc.update("delete from admin_audit_logs");
        profiles.deleteAllInBatch();
        applications.deleteAllInBatch();
        refreshTokens.deleteAllInBatch();
        accounts.deleteAllInBatch();
        identities.deleteAllInBatch();
        now = NOW;
        when(clock.instant()).thenAnswer(call -> now);
        admin = account("admin@example.test", ADMIN, ACTIVE, false);
    }

    @Test
    void approvedApplicantCanChangePasswordThenUseProviderSession() throws Exception {
        var application = application(EMAIL);
        var approved = send(ADMIN_APPLICATIONS + "/" + application.getId() + "/approve", null,
                jwt.issueAccess(admin).getTokenValue(), null, nextIp(), true);
        assertStatus(approved, 200);
        assertThat(body(approved).get("credentialsEmailStatus").asString()).isEqualTo("SENT");
        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(message.capture());
        String temporary = passwordFromMail(message.getValue());
        Account provider = accounts.findByEmail(EMAIL).orElseThrow();

        Cookie adminRefresh = issueRefresh(admin);
        var first = send(LOGIN, credentials("  PROVIDER@EXAMPLE.TEST ", temporary), "stale.bearer.token",
                adminRefresh, nextIp(), true);
        assertStatus(first, 200);
        assertThat(first.getResponse().getHeader(HttpHeaders.CACHE_CONTROL)).isEqualTo("no-store");
        assertCleared(first, COOKIE_NAME);
        assertCleared(first, CSRF_COOKIE);
        var limited = body(first);
        assertThat(limited.get("mustChangePassword").asBoolean()).isTrue();
        assertThat(Instant.parse(limited.get("expiresAt").asString())).isEqualTo(now.plusSeconds(300));
        assertThat(limited.get("accessToken")).isNull();
        assertThat(limited.get("refreshToken")).isNull();
        assertThat(limited.get("account")).isNull();
        assertThat(refreshTokens.count()).isEqualTo(1);
        assertThat(stored(adminRefresh).getRevokedAt()).isNull();
        assertThat(read(provider).getLastLoginAt()).isEqualTo(now);

        String limitedToken = limited.get("passwordChangeToken").asString();
        mvc.perform(get("/api/provider/availability").header(HttpHeaders.AUTHORIZATION, "Bearer " + limitedToken))
                .andExpect(status().isUnauthorized());
        Cookie oldProviderRefresh = issueRefresh(provider);
        now = now.plusSeconds(1);
        var replaced = send(FIRST_PASSWORD, Map.of("currentPassword", temporary, "newPassword", NEW_PASSWORD,
                "accountId", admin.getId(), "email", admin.getEmail(), "role", "ADMIN"), limitedToken,
                adminRefresh, nextIp(), true);
        assertStatus(replaced, 200);
        assertThat(replaced.getResponse().getHeader(HttpHeaders.CACHE_CONTROL)).isEqualTo("no-store");
        assertCleared(replaced, CSRF_COOKIE);
        String access = assertSession(replaced, provider);
        Cookie currentRefresh = cookie(replaced, COOKIE_NAME);
        assertThat(stored(oldProviderRefresh).getRevokedAt()).isEqualTo(now);
        assertThat(stored(adminRefresh).getRevokedAt()).isNull();
        assertThat(stored(currentRefresh).getRevokedAt()).isNull();
        assertThat(read(provider).getMustChangePassword()).isFalse();
        assertThat(read(admin).getPasswordHash()).isEqualTo(admin.getPasswordHash());
        assertThat(applications.findById(application.getId()).orElseThrow().getCredentialsEmailStatus()).isEqualTo(SENT);
        assertThat(profiles.existsById(provider.getId())).isTrue();

        var me = mvc.perform(get(AUTH + "/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + access))
                .andExpect(status().isOk()).andReturn();
        assertThat(body(me)).isEqualTo(body(replaced).get("account"));
        for (String prefix : new String[]{"/api", "/api/v1"}) {
            mvc.perform(get(prefix + "/provider/availability").header(HttpHeaders.AUTHORIZATION, "Bearer " + access))
                    .andExpect(status().isOk());
            assertError(send(prefix + "/customer/bookings", Map.of(), access, null, nextIp(), true),
                    403, "ACCESS_DENIED");
        }
        mvc.perform(get(ADMIN_APPLICATIONS).header(HttpHeaders.AUTHORIZATION, "Bearer " + access))
                .andExpect(status().isForbidden());
        mvc.perform(get(AUTH + "/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + limitedToken))
                .andExpect(status().isUnauthorized());

        var rotated = refresh(currentRefresh);
        assertSession(rotated, provider);
        var logout = send(LOGOUT, null, null, cookie(rotated, COOKIE_NAME), nextIp(), true);
        assertStatus(logout, 204);
        assertCleared(logout, COOKIE_NAME);
        assertCleared(logout, CSRF_COOKIE);
        assertError(refresh(cookie(rotated, COOKIE_NAME)), 401, "REFRESH_TOKEN_INVALID");
        assertError(login(EMAIL, temporary), 401, "INVALID_CREDENTIALS");
        now = now.plusSeconds(1);
        var normal = login(EMAIL, NEW_PASSWORD);
        assertSession(normal, provider);
        assertCleared(normal, CSRF_COOKIE);
        assertThat(normal.getResponse().getHeader(HttpHeaders.CACHE_CONTROL)).isEqualTo("no-store");
        assertThat(read(provider).getLastLoginAt()).isEqualTo(now);
    }

    @Test
    void rejectsWrongPasswordRoleMissingAccountAndIneligibleProvider() throws Exception {
        var fixture = provider(true);
        var provider = fixture.account();
        var customer = account("customer@example.test", CUSTOMER, ACTIVE, false);
        var pending = application("waiting@example.test");
        assertError(login(EMAIL, OTHER_PASSWORD), 401, "INVALID_CREDENTIALS");
        assertError(login(customer.getEmail(), TEMPORARY_PASSWORD), 401, "INVALID_CREDENTIALS");
        assertError(login(admin.getEmail(), TEMPORARY_PASSWORD), 401, "INVALID_CREDENTIALS");
        assertError(login(pending.getEmail(), TEMPORARY_PASSWORD), 401, "INVALID_CREDENTIALS");
        for (String path : new String[]{AUTH + "/login", AUTH + "/login/admin"}) {
            assertError(send(path, credentials(EMAIL, TEMPORARY_PASSWORD), null, null, nextIp(), true),
                    401, "INVALID_CREDENTIALS");
        }

        setStatus(provider, SUSPENDED);
        assertError(login(EMAIL, TEMPORARY_PASSWORD), 403, "ACCOUNT_SUSPENDED");
        setStatus(provider, PENDING_EMAIL);
        assertError(login(EMAIL, TEMPORARY_PASSWORD), 403, "EMAIL_NOT_VERIFIED");
        setStatus(provider, ACTIVE);
        jdbc.update("update provider_applications set status = 'PENDING_REVIEW' where id = ?", fixture.applicationId());
        assertError(login(EMAIL, TEMPORARY_PASSWORD), 409, "DATA_CONFLICT");
        profiles.deleteById(provider.getId());
        assertError(login(EMAIL, TEMPORARY_PASSWORD), 409, "DATA_CONFLICT");
        assertThat(read(provider).getLastLoginAt()).isNull();
        assertThat(refreshTokens.count()).isZero();
    }

    @Test
    void loginAndFirstPasswordShareRateLimitWithCustomerAndAdminEndpoints() throws Exception {
        provider(true);
        var ip = nextIp();
        var credentials = credentials(EMAIL, TEMPORARY_PASSWORD);
        assertError(send(LOGIN, credentials, null, null, ip, false), 403, "CSRF_INVALID");
        assertError(send(AUTH + "/login", credentials, null, null, ip, true), 401, "INVALID_CREDENTIALS");
        assertError(send(AUTH + "/login/admin", credentials, null, null, ip, true), 401, "INVALID_CREDENTIALS");
        var limited = send(LOGIN, credentials, null, null, ip, true);
        assertStatus(limited, 200);
        var token = body(limited).get("passwordChangeToken").asString();
        assertError(send(FIRST_PASSWORD, passwordChange(TEMPORARY_PASSWORD, NEW_PASSWORD), token, null, ip, false),
                403, "CSRF_INVALID");
        assertError(send(FIRST_PASSWORD, passwordChange(OTHER_PASSWORD, NEW_PASSWORD), token, null, ip, true),
                401, "INVALID_CREDENTIALS");
        var blocked = send(FIRST_PASSWORD, passwordChange(TEMPORARY_PASSWORD, NEW_PASSWORD), token, null, ip, true);
        assertError(blocked, 429, "LOGIN_RATE_LIMITED");
        assertThat(blocked.getResponse().getHeader(HttpHeaders.RETRY_AFTER)).isEqualTo("60");
        assertError(send(LOGIN, credentials, null, null, ip, true), 429, "LOGIN_RATE_LIMITED");
        now = now.plusSeconds(60);
        assertStatus(send(FIRST_PASSWORD, passwordChange(TEMPORARY_PASSWORD, NEW_PASSWORD), token, null, ip, true), 200);
    }

    @Test
    void firstPasswordRechecksCredentialsAndEligibilityAndRejectsRepeat() throws Exception {
        var fixture = provider(true);
        var provider = fixture.account();
        String token = limitedToken();
        assertError(change(token, TEMPORARY_PASSWORD, "short"), 400, "VALIDATION_ERROR");
        String longInUtf8 = "é".repeat(37);
        assertError(change(token, longInUtf8, NEW_PASSWORD), 400, "PASSWORD_TOO_LONG");
        assertError(change(token, TEMPORARY_PASSWORD, longInUtf8), 400, "PASSWORD_TOO_LONG");
        assertError(change(token, TEMPORARY_PASSWORD, TEMPORARY_PASSWORD), 400, "PASSWORD_UNCHANGED");
        assertError(change(token, OTHER_PASSWORD, NEW_PASSWORD), 401, "INVALID_CREDENTIALS");
        setStatus(provider, SUSPENDED);
        assertError(change(token, TEMPORARY_PASSWORD, NEW_PASSWORD), 403, "ACCOUNT_SUSPENDED");
        setStatus(provider, PENDING_EMAIL);
        assertError(change(token, TEMPORARY_PASSWORD, NEW_PASSWORD), 403, "EMAIL_NOT_VERIFIED");
        setStatus(provider, ACTIVE);
        jdbc.update("update provider_applications set status = 'PENDING_REVIEW' where id = ?", fixture.applicationId());
        assertError(change(token, TEMPORARY_PASSWORD, NEW_PASSWORD), 409, "DATA_CONFLICT");
        jdbc.update("update provider_applications set status = 'APPROVED' where id = ?", fixture.applicationId());
        assertThat(read(provider).getPasswordHash()).isEqualTo(provider.getPasswordHash());
        assertThat(refreshTokens.count()).isZero();

        assertSession(change(token, TEMPORARY_PASSWORD, NEW_PASSWORD), provider);
        assertError(change(token, NEW_PASSWORD, OTHER_PASSWORD), 409, "PASSWORD_CHANGE_NOT_REQUIRED");
        assertThat(refreshTokens.count()).isEqualTo(1);
    }

    @Test
    void failedRefreshInsertRollsBackPasswordAndPriorTokenRevocation() throws Exception {
        var provider = provider(true).account();
        Cookie old = issueRefresh(provider);
        String token = limitedToken();
        jdbc.execute("alter table refresh_tokens add constraint test_reject_auth_issue check (revoked_at is not null) nocheck");
        try {
            var failed = change(token, TEMPORARY_PASSWORD, NEW_PASSWORD);
            assertError(failed, 409, "DATA_CONFLICT");
            assertThat(failed.getResponse().getCookie(COOKIE_NAME)).isNull();
            assertThat(read(provider).getPasswordHash()).isEqualTo(provider.getPasswordHash());
            assertThat(read(provider).getMustChangePassword()).isTrue();
            assertThat(stored(old).getRevokedAt()).isNull();
            assertThat(refreshTokens.count()).isEqualTo(1);
        } finally {
            jdbc.execute("alter table refresh_tokens drop constraint test_reject_auth_issue");
        }
        assertSession(change(token, TEMPORARY_PASSWORD, NEW_PASSWORD), provider);
    }

    @Test
    void simultaneousPasswordChangesCreateOneSession() throws Exception {
        var provider = provider(true).account();
        String token = limitedToken();
        var encoding = new CountDownLatch(1);
        var resume = new CountDownLatch(1);
        pauseNewPasswordEncoding(encoding, resume);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var winner = pool.submit(() -> change(token, TEMPORARY_PASSWORD, NEW_PASSWORD));
            try {
                awaitLatch(encoding);
                var other = pool.submit(() -> change(token, TEMPORARY_PASSWORD, OTHER_PASSWORD));
                awaitAccountLock();
                resume.countDown();
                assertSession(winner.get(5, TimeUnit.SECONDS), provider);
                assertError(other.get(5, TimeUnit.SECONDS), 409, "PASSWORD_CHANGE_NOT_REQUIRED");
            } finally {
                resume.countDown();
            }
        }
        assertThat(passwords.matches(NEW_PASSWORD, read(provider).getPasswordHash())).isTrue();
        assertThat(refreshTokens.count()).isEqualTo(1);
    }

    @Test
    void reissueWaitingOnFirstPasswordCannotOverwriteNewHash() throws Exception {
        var fixture = provider(true);
        var provider = fixture.account();
        var admin = adminBearer();
        String token = limitedToken();
        var encoding = new CountDownLatch(1);
        var resume = new CountDownLatch(1);
        pauseNewPasswordEncoding(encoding, resume);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var change = pool.submit(() -> change(token, TEMPORARY_PASSWORD, NEW_PASSWORD));
            try {
                awaitLatch(encoding);
                var reissue = pool.submit(() -> reissue(fixture.applicationId(), admin));
                awaitAccountLock();
                resume.countDown();
                var changed = change.get(5, TimeUnit.SECONDS);
                assertSession(changed, provider);
                assertError(reissue.get(5, TimeUnit.SECONDS), 409, "CREDENTIAL_REISSUE_NOT_ALLOWED");
                assertThat(stored(cookie(changed, COOKIE_NAME)).getRevokedAt()).isNull();
            } finally {
                resume.countDown();
            }
        }
        assertThat(passwords.matches(NEW_PASSWORD, read(provider).getPasswordHash())).isTrue();
        assertThat(mailStatus(fixture)).isEqualTo(FAILED);
        assertThat(refreshTokens.count()).isEqualTo(1);
        verifyNoInteractions(mail);
    }

    @Test
    void reissueCommitInvalidatesOldPasswordAndLateMailCannotOverwriteDecision() throws Exception {
        var fixture = provider(true);
        var provider = fixture.account();
        String admin = adminBearer();
        String token = limitedToken();
        Cookie old = issueRefresh(provider);
        var awaitingMail = new CountDownLatch(1);
        var finishMail = new CountDownLatch(1);
        var captured = ArgumentCaptor.forClass(SimpleMailMessage.class);
        doAnswer(call -> {
            awaitingMail.countDown();
            awaitLatch(finishMail);
            return null;
        }).when(mail).send(captured.capture());

        try (var pool = Executors.newSingleThreadExecutor()) {
            var reissue = pool.submit(() -> reissue(fixture.applicationId(), admin));
            try {
                awaitLatch(awaitingMail);
                assertThat(stored(old).getRevokedAt()).isEqualTo(now);
                assertError(change(token, TEMPORARY_PASSWORD, NEW_PASSWORD), 401, "INVALID_CREDENTIALS");
                String reissuedPassword = passwordFromMail(captured.getValue());
                assertSession(change(token, reissuedPassword, NEW_PASSWORD), provider);
                finishMail.countDown();
                var result = reissue.get(5, TimeUnit.SECONDS);
                assertStatus(result, 200);
                assertThat(body(result).get("credentialsEmailStatus").asString()).isEqualTo("UNCONFIRMED");
            } finally {
                finishMail.countDown();
            }
        }
        assertThat(mailStatus(fixture)).isEqualTo(UNCONFIRMED);
        assertThat(passwords.matches(NEW_PASSWORD, read(provider).getPasswordHash())).isTrue();
        assertThat(read(provider).getMustChangePassword()).isFalse();
    }

    @Test
    void refreshRotationPreservesAbsoluteExpiryAndReuseRevokesDescendants() throws Exception {
        var provider = provider(false).account();
        var loggedIn = login(EMAIL, TEMPORARY_PASSWORD);
        assertSession(loggedIn, provider);
        Cookie original = cookie(loggedIn, COOKIE_NAME);
        var originalRow = stored(original);
        now = now.plus(Duration.ofDays(2));
        var rotated = refresh(original);
        assertSession(rotated, provider);
        Cookie successor = cookie(rotated, COOKIE_NAME);
        var current = stored(successor);
        assertThat(current.getId()).isNotEqualTo(originalRow.getId());
        assertThat(current.getFamilyId()).isEqualTo(originalRow.getFamilyId());
        assertThat(current.getExpiresAt()).isEqualTo(originalRow.getExpiresAt());
        assertThat(successor.getMaxAge()).isEqualTo(Math.toIntExact(Duration.between(now, current.getExpiresAt()).toSeconds()));
        assertThat(stored(original).getUsedAt()).isEqualTo(now);

        var replay = refresh(original);
        assertError(replay, 401, "REFRESH_TOKEN_REUSED");
        assertCleared(replay, COOKIE_NAME);
        assertThat(stored(successor).getRevokedAt()).isEqualTo(now);
        assertError(refresh(successor), 401, "REFRESH_TOKEN_INVALID");

        var independent = cookie(login(EMAIL, TEMPORARY_PASSWORD), COOKIE_NAME);
        var expiry = stored(independent).getExpiresAt();
        now = expiry.minusSeconds(1);
        var finalRotation = refresh(independent);
        assertSession(finalRotation, provider);
        Cookie expiring = cookie(finalRotation, COOKIE_NAME);
        assertThat(expiring.getMaxAge()).isEqualTo(1);
        now = expiry;
        assertError(refresh(expiring), 401, "REFRESH_TOKEN_INVALID");
    }

    @Test
    void refreshRevokesSessionsAfterLossOfEligibilityAndLogoutOnlyRevokesCurrentFamily() throws Exception {
        var fixture = provider(false);
        var provider = fixture.account();
        var loggedIn = login(EMAIL, TEMPORARY_PASSWORD);
        String access = assertSession(loggedIn, provider);
        Cookie firstFamily = cookie(loggedIn, COOKIE_NAME);
        Cookie secondFamily = cookie(login(EMAIL, TEMPORARY_PASSWORD), COOKIE_NAME);
        assertThat(stored(firstFamily).getFamilyId()).isNotEqualTo(stored(secondFamily).getFamilyId());
        var logout = send(LOGOUT, null, null, firstFamily, nextIp(), true);
        assertStatus(logout, 204);
        assertCleared(logout, COOKIE_NAME);
        assertCleared(logout, CSRF_COOKIE);
        assertThat(stored(firstFamily).getRevokedAt()).isEqualTo(now);
        assertThat(stored(secondFamily).getRevokedAt()).isNull();
        mvc.perform(get(AUTH + "/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + access))
                .andExpect(status().isOk());
        assertError(refresh(firstFamily), 401, "REFRESH_TOKEN_INVALID");
        var suspended = cookie(refresh(secondFamily), COOKIE_NAME);

        setStatus(provider, SUSPENDED);
        assertError(refresh(suspended), 401, "REFRESH_TOKEN_INVALID");
        assertThat(stored(suspended).getRevokedAt()).isEqualTo(now);
        setStatus(provider, ACTIVE);
        var forced = cookie(login(EMAIL, TEMPORARY_PASSWORD), COOKIE_NAME);
        jdbc.update("update accounts set must_change_password = true where id = ?", provider.getId());
        assertError(refresh(forced), 401, "REFRESH_TOKEN_INVALID");
        assertThat(stored(forced).getRevokedAt()).isEqualTo(now);
        jdbc.update("update accounts set must_change_password = false where id = ?", provider.getId());
        var unlinked = cookie(login(EMAIL, TEMPORARY_PASSWORD), COOKIE_NAME);
        profiles.deleteById(provider.getId());
        assertError(refresh(unlinked), 401, "REFRESH_TOKEN_INVALID");
        assertThat(stored(unlinked).getRevokedAt()).isEqualTo(now);
    }

    private ProviderFixture provider(boolean mustChange) {
        var application = application(EMAIL);
        application.setStatus(APPROVED);
        application.setDecidedAt(now);
        application.setDecidedByAdmin(admin);
        application.setCredentialsEmailStatus(FAILED);
        applications.saveAndFlush(application);
        var account = createAccount(EMAIL, PROVIDER, ACTIVE, mustChange);
        var profile = new ProviderProfile();
        profile.setAccount(account);
        profile.setApplication(application);
        profile.setCity(application.getCity());
        profile.setBusinessName(application.getBusinessName());
        profiles.saveAndFlush(profile);
        return new ProviderFixture(account, application.getId());
    }

    private ProviderApplication application(String email) {
        identities.saveAndFlush(new EmailIdentity(email, PROVIDER));
        var result = new ProviderApplication();
        result.setEmail(email);
        result.setApplicantName("Nhà cung cấp");
        result.setPhone("0901234567");
        result.setBusinessName("Dịch vụ tại nhà");
        result.setCity("Hà Nội");
        result.setDescription("Hồ sơ thử nghiệm");
        result.setDocumentUrl("https://drive.google.com/drive/folders/fixture");
        result.setStatus(PENDING_REVIEW);
        result.setEmailVerifiedAt(now);
        return applications.saveAndFlush(result);
    }

    private Account account(String email, AccountType type, AccountStatus status, boolean mustChange) {
        identities.saveAndFlush(new EmailIdentity(email, type));
        return createAccount(email, type, status, mustChange);
    }

    private Account createAccount(String email, AccountType type, AccountStatus status, boolean mustChange) {
        var result = new Account();
        result.setEmailIdentity(identities.findById(email).orElseThrow());
        result.setEmail(email);
        result.setAccountType(type);
        result.setDisplayName("Tài khoản thử nghiệm");
        result.setPasswordHash(passwords.encode(TEMPORARY_PASSWORD));
        result.setStatus(status);
        result.setEmailVerifiedAt(now);
        result.setMustChangePassword(mustChange);
        return accounts.saveAndFlush(result);
    }

    private Account read(Account account) {
        return accounts.findById(account.getId()).orElseThrow();
    }

    private void setStatus(Account account, AccountStatus status) {
        var current = read(account);
        current.setStatus(status);
        current.setEmailVerifiedAt(status == PENDING_EMAIL ? null : now);
        current.setSuspendedAt(status == SUSPENDED ? now : null);
        current.setSuspensionReason(status == SUSPENDED ? "fixture" : null);
        accounts.saveAndFlush(current);
    }

    private CredentialsEmailStatus mailStatus(ProviderFixture fixture) {
        return applications.findById(fixture.applicationId()).orElseThrow().getCredentialsEmailStatus();
    }

    private String adminBearer() {
        return jwt.issueAccess(admin).getTokenValue();
    }

    private Cookie issueRefresh(Account account) {
        var pair = transactions.execute(status -> {
            Account locked = accounts.findByIdForUpdate(account.getId()).orElseThrow();
            return refreshService.issueOnLogin(locked, null);
        });
        return new Cookie(COOKIE_NAME, pair.refreshToken());
    }

    private RefreshToken stored(Cookie cookie) {
        return refreshTokens.findById(UUID.fromString(jwt.decodeRefresh(cookie.getValue()).getId())).orElseThrow();
    }

    private void pauseNewPasswordEncoding(CountDownLatch encoding, CountDownLatch resume) {
        doAnswer(call -> {
            encoding.countDown();
            awaitLatch(resume);
            return call.callRealMethod();
        }).when(passwords).encode(NEW_PASSWORD);
    }

    private void awaitAccountLock() {
        await().atMost(Duration.ofSeconds(5)).until(() -> jdbc.queryForObject("""
                select count(*) from information_schema.sessions
                where blocker_id is not null and lower(executing_statement) like '%from accounts%'
                """, Long.class) == 1);
    }

    private static void awaitLatch(CountDownLatch latch) throws InterruptedException {
        assertThat(latch.await(10, TimeUnit.SECONDS)).isTrue();
    }

    private static String passwordFromMail(SimpleMailMessage message) {
        var matcher = MAILED_PASSWORD.matcher(message.getText());
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private static String nextIp() {
        return "192.0.2." + CLIENTS.incrementAndGet();
    }

    private MvcResult login(String email, String password) throws Exception {
        return send(LOGIN, credentials(email, password), null, null, nextIp(), true);
    }

    private String limitedToken() throws Exception {
        var login = login(EMAIL, TEMPORARY_PASSWORD);
        assertStatus(login, 200);
        return body(login).get("passwordChangeToken").asString();
    }

    private MvcResult change(String token, String current, String next) throws Exception {
        return send(FIRST_PASSWORD, passwordChange(current, next), token, null, nextIp(), true);
    }

    private MvcResult reissue(long applicationId, String admin) throws Exception {
        return send(ADMIN_APPLICATIONS + "/" + applicationId + "/reissue-credentials", null, admin, null, nextIp(), true);
    }

    private MvcResult refresh(Cookie refresh) throws Exception {
        return send(REFRESH, null, null, refresh, nextIp(), true);
    }

    private MvcResult send(String path, Map<String, ?> payload, String bearer, Cookie refresh,
                           String ip, boolean withCsrf) throws Exception {
        var request = post(path).with(servlet -> { servlet.setRemoteAddr(ip); return servlet; });
        if (withCsrf) {
            var csrf = mvc.perform(get(AUTH + "/csrf")).andExpect(status().isOk()).andReturn();
            var cookie = cookie(csrf, CSRF_COOKIE);
            request.cookie(refresh == null ? new Cookie[]{cookie} : new Cookie[]{cookie, refresh});
            request.header("X-XSRF-TOKEN", body(csrf).get("token").asString());
        } else if (refresh != null) {
            request.cookie(refresh);
        }
        if (bearer != null) request.header(HttpHeaders.AUTHORIZATION, "Bearer " + bearer);
        if (payload != null) request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload));
        return mvc.perform(request).andReturn();
    }

    private static Map<String, String> credentials(String email, String password) {
        return Map.of("email", email, "password", password);
    }

    private static Map<String, String> passwordChange(String current, String next) {
        return Map.of("currentPassword", current, "newPassword", next);
    }

    private String assertSession(MvcResult result, Account account) throws Exception {
        assertStatus(result, 200);
        var session = body(result);
        var accountJson = session.get("account");
        assertThat(accountJson.get("id").asLong()).isEqualTo(account.getId());
        assertThat(accountJson.get("email").asString()).isEqualTo(account.getEmail());
        assertThat(accountJson.get("accountType").asString()).isEqualTo("PROVIDER");
        assertThat(accountJson.get("mustChangePassword").asBoolean()).isFalse();
        assertThat(session.get("tokenType").asString()).isEqualTo("Bearer");
        assertThat(cookie(result, COOKIE_NAME).isHttpOnly()).isTrue();
        return session.get("accessToken").asString();
    }

    private JsonNode body(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString());
    }

    private static Cookie cookie(MvcResult result, String name) {
        var cookie = result.getResponse().getCookie(name);
        assertThat(cookie).isNotNull();
        return cookie;
    }

    private static void assertCleared(MvcResult result, String name) {
        var cookie = cookie(result, name);
        assertThat(cookie.getValue()).isEmpty();
        assertThat(cookie.getMaxAge()).isZero();
    }

    private static void assertStatus(MvcResult result, int expected) {
        assertThat(result.getResponse().getStatus()).isEqualTo(expected);
    }

    private void assertError(MvcResult result, int expected, String code) throws Exception {
        assertStatus(result, expected);
        assertThat(body(result).get("code").asString()).isEqualTo(code);
    }

    private record ProviderFixture(Account account, long applicationId) {}
}
