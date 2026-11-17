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
import com.homeservice.config.properties.JwtProperties;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:nestify-admin-auth-test;DB_CLOSE_DELAY=-1",
        "app.auth.login-rate-limit.max-attempts-per-email-and-ip=2",
        "app.auth.login-rate-limit.max-attempts-per-ip=12",
        "app.auth.login-rate-limit.window=1m"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminAuthIntegrationTests {
    private static final String ADMIN = "admin@example.test";
    private static final String PASSWORD = "Admin-test-password-123!";
    private static final String ROOT = "/api/auth";
    private static final String REFRESH_COOKIE = "NESTIFY_REFRESH";
    private static final String CSRF_COOKIE = "XSRF-TOKEN";
    private static final AtomicInteger CLIENTS = new AtomicInteger();

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AccountRepository accounts;
    @Autowired EmailIdentityRepository identities;
    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired JwtTokenService jwtTokens;
    @Autowired TokenService randomValues;
    @Autowired JwtProperties jwtProperties;
    @Autowired @Qualifier("accessJwtDecoder") JwtDecoder accessDecoder;
    @Autowired PasswordEncoder passwords;
    @MockitoBean Clock clock;

    private Instant now;

    @BeforeEach
    void resetData() {
        refreshTokens.deleteAllInBatch();
        accounts.deleteAllInBatch();
        identities.deleteAllInBatch();
        now = Instant.parse("2026-11-14T02:30:00Z");
        when(clock.instant()).thenAnswer(call -> now);
    }

    @Test
    void loginIssuesAdminJwtAndRefreshCookieAndMeReadsTheSameAccount() throws Exception {
        var admin = createAccount(ADMIN, AccountType.ADMIN, AccountStatus.ACTIVE, false);
        var client = new Client();
        var result = client.post("/login/admin", Map.of("email", " ADMIN@EXAMPLE.TEST ", "password", PASSWORD), true);
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        var login = body(result);
        assertThat(login.get("account").get("id").asLong()).isEqualTo(admin.getId());
        assertThat(login.get("account").get("accountType").asString()).isEqualTo("ADMIN");
        var access = accessDecoder.decode(login.get("accessToken").asString());
        assertThat(access.getSubject()).isEqualTo(admin.getId().toString());
        assertThat(access.getClaimAsString("role")).isEqualTo("ADMIN");
        assertThat(access.getExpiresAt()).isEqualTo(now.plus(jwtProperties.accessTtl()));
        var refresh = result.getResponse().getCookie(REFRESH_COOKIE);
        assertThat(refresh.isHttpOnly()).isTrue();
        assertThat(refresh.getPath()).isEqualTo(ROOT);
        assertThat(result.getResponse().getCookie(CSRF_COOKIE).getMaxAge()).isZero();
        assertThat(result.getResponse().getContentAsString()).doesNotContain("passwordHash", "refreshToken");
        assertThat(accounts.findById(admin.getId()).orElseThrow().getLastLoginAt()).isEqualTo(now);

        mvc.perform(get(ROOT + "/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + access.getTokenValue()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(admin.getId()))
                .andExpect(jsonPath("$.accountType").value("ADMIN"));
        mvc.perform(get(ROOT + "/me").cookie(refresh)).andExpect(status().isUnauthorized());
        assertError(client.post("/refresh", null, false), 403, "CSRF_INVALID");
    }

    @Test
    void adminLoginRejectsWrongCredentialsAndAnyOtherRole() throws Exception {
        createAccount(ADMIN, AccountType.ADMIN, AccountStatus.ACTIVE, false);
        createAccount("customer@example.test", AccountType.CUSTOMER, AccountStatus.ACTIVE, false);
        var provider = createAccount("provider@example.test", AccountType.PROVIDER, AccountStatus.ACTIVE, false);
        assertError(new Client().post("/login/admin", Map.of("email", ADMIN, "password", "wrong-password"), true),
                401, "INVALID_CREDENTIALS");
        for (String email : new String[]{"unknown@example.test", "customer@example.test", provider.getEmail()}) {
            assertError(new Client().post("/login/admin", Map.of("email", email, "password", PASSWORD, "role", "ADMIN"), true),
                    401, "INVALID_CREDENTIALS");
        }
        assertError(new Client().post("/login", Map.of("email", ADMIN, "password", PASSWORD), true),
                401, "INVALID_CREDENTIALS");
        assertError(new Client().post("/login", Map.of("email", provider.getEmail(), "password", PASSWORD), true),
                401, "INVALID_CREDENTIALS");
        assertThat(refreshTokens.count()).isZero();

        var providerTokenId = UUID.randomUUID();
        var providerRefresh = jwtTokens.issueRefresh(provider.getId(), providerTokenId, now.plus(jwtProperties.refreshTtl()));
        var stored = new RefreshToken();
        stored.setId(providerTokenId);
        stored.setAccount(provider);
        stored.setFamilyId(UUID.randomUUID());
        stored.setTokenHash(randomValues.hashToken(providerRefresh.getTokenValue()));
        stored.setCreatedAt(now);
        stored.setExpiresAt(providerRefresh.getExpiresAt());
        refreshTokens.saveAndFlush(stored);
        var client = new Client();
        client.cookies.put(REFRESH_COOKIE, new Cookie(REFRESH_COOKIE, providerRefresh.getTokenValue()));
        assertError(client.post("/refresh", null, true), 401, "REFRESH_TOKEN_INVALID");
        assertThat(refreshTokens.count()).isEqualTo(1);
    }

    @Test
    void adminLoginRejectsSuspendedUnverifiedAndPasswordChangeAccounts() throws Exception {
        createAccount("locked@example.test", AccountType.ADMIN, AccountStatus.SUSPENDED, false);
        createAccount("pending@example.test", AccountType.ADMIN, AccountStatus.PENDING_EMAIL, false);
        createAccount("change-password@example.test", AccountType.ADMIN, AccountStatus.ACTIVE, true);
        var client = new Client();
        assertError(client.post("/login/admin", Map.of("email", "locked@example.test", "password", PASSWORD), true),
                403, "ACCOUNT_SUSPENDED");
        assertError(client.post("/login/admin", Map.of("email", "pending@example.test", "password", PASSWORD), true),
                403, "EMAIL_NOT_VERIFIED");
        assertError(client.post("/login/admin", Map.of("email", "change-password@example.test", "password", PASSWORD), true),
                403, "PASSWORD_CHANGE_REQUIRED");
        assertThat(refreshTokens.count()).isZero();
    }

    @Test
    void adminLoginRequiresCsrfAndSharesRateLimitWithCustomerLogin() throws Exception {
        createAccount(ADMIN, AccountType.ADMIN, AccountStatus.ACTIVE, false);
        var client = new Client();
        var correct = Map.of("email", ADMIN, "password", PASSWORD);
        assertError(client.post("/login/admin", correct, false), 403, "CSRF_INVALID");
        assertError(client.post("/login/admin", Map.of("email", ADMIN, "password", "wrong-password"), true),
                401, "INVALID_CREDENTIALS");
        assertError(client.post("/login", correct, true), 401, "INVALID_CREDENTIALS");
        var limited = client.post("/login/admin", correct, true);
        assertError(limited, 429, "LOGIN_RATE_LIMITED");
        assertThat(limited.getResponse().getHeader(HttpHeaders.RETRY_AFTER)).isEqualTo("60");
        assertThat(refreshTokens.count()).isZero();
        now = now.plusSeconds(60);
        assertThat(client.post("/login/admin", correct, true).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void adminRefreshKeepsAbsoluteDeadlineAndReplayRevokesOnlyItsFamily() throws Exception {
        var admin = createAccount(ADMIN, AccountType.ADMIN, AccountStatus.ACTIVE, false);
        var client = new Client();
        var otherSession = new Client();
        var login = Map.of("email", ADMIN, "password", PASSWORD);
        assertThat(client.post("/login/admin", login, true).getResponse().getStatus()).isEqualTo(200);
        assertThat(otherSession.post("/login/admin", login, true).getResponse().getStatus()).isEqualTo(200);
        var original = client.cookies.get(REFRESH_COOKIE);
        var deadline = jwtTokens.decodeRefresh(original.getValue()).getExpiresAt();
        now = now.plus(jwtProperties.accessTtl());
        var refreshed = client.post("/refresh", null, true);
        assertThat(refreshed.getResponse().getStatus()).isEqualTo(200);
        var replacement = client.cookies.get(REFRESH_COOKIE);
        assertThat(replacement.getValue()).isNotEqualTo(original.getValue());
        assertThat(jwtTokens.decodeRefresh(replacement.getValue()).getExpiresAt()).isEqualTo(deadline);
        var access = accessDecoder.decode(body(refreshed).get("accessToken").asString());
        assertThat(access.getClaimAsString("role")).isEqualTo("ADMIN");
        assertThat(access.getSubject()).isEqualTo(admin.getId().toString());

        client.cookies.put(REFRESH_COOKIE, original);
        assertError(client.post("/refresh", null, true), 401, "REFRESH_TOKEN_REUSED");
        client.cookies.put(REFRESH_COOKIE, replacement);
        assertError(client.post("/refresh", null, true), 401, "REFRESH_TOKEN_INVALID");
        assertThat(otherSession.post("/refresh", null, true).getResponse().getStatus()).isEqualTo(200);
        now = deadline;
        assertError(otherSession.post("/refresh", null, true), 401, "REFRESH_TOKEN_INVALID");
    }

    @Test
    void adminLogoutClearsCookiesAndRevokesOnlyCurrentRefreshFamily() throws Exception {
        createAccount(ADMIN, AccountType.ADMIN, AccountStatus.ACTIVE, false);
        var client = new Client();
        var otherSession = new Client();
        var login = Map.of("email", ADMIN, "password", PASSWORD);
        var first = client.post("/login/admin", login, true);
        assertThat(first.getResponse().getStatus()).isEqualTo(200);
        assertThat(otherSession.post("/login/admin", login, true).getResponse().getStatus()).isEqualTo(200);
        var oldCookie = client.cookies.get(REFRESH_COOKIE);
        assertError(client.post("/logout", null, false), 403, "CSRF_INVALID");
        var logout = client.post("/logout", null, true);
        assertThat(logout.getResponse().getStatus()).isEqualTo(204);
        assertThat(logout.getResponse().getCookie(REFRESH_COOKIE).getMaxAge()).isZero();
        assertThat(logout.getResponse().getCookie(CSRF_COOKIE).getMaxAge()).isZero();
        client.cookies.put(REFRESH_COOKIE, oldCookie);
        assertError(client.post("/refresh", null, true), 401, "REFRESH_TOKEN_INVALID");
        assertThat(otherSession.post("/refresh", null, true).getResponse().getStatus()).isEqualTo(200);

        String access = body(first).get("accessToken").asString();
        mvc.perform(get(ROOT + "/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + access)).andExpect(status().isOk());
        now = now.plus(jwtProperties.accessTtl());
        mvc.perform(get(ROOT + "/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + access))
                .andExpect(status().isUnauthorized());
    }

    private Account createAccount(String email, AccountType type, AccountStatus status, boolean mustChangePassword) {
        var identity = identities.saveAndFlush(new EmailIdentity(email, type));
        var account = new Account();
        account.setEmail(email);
        account.setEmailIdentity(identity);
        account.setAccountType(type);
        account.setDisplayName("Tài khoản test");
        account.setPasswordHash(passwords.encode(PASSWORD));
        account.setStatus(status);
        account.setMustChangePassword(mustChangePassword);
        if (status != AccountStatus.PENDING_EMAIL) account.setEmailVerifiedAt(now);
        if (status == AccountStatus.SUSPENDED) {
            account.setSuspendedAt(now);
            account.setSuspensionReason("Tài khoản test bị khóa");
        }
        return accounts.saveAndFlush(account);
    }

    private JsonNode body(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString());
    }

    private void assertError(MvcResult result, int expectedStatus, String code) throws Exception {
        assertThat(result.getResponse().getStatus()).isEqualTo(expectedStatus);
        assertThat(body(result).get("code").asString()).isEqualTo(code);
    }

    private final class Client {
        private final String ip = "192.0.2." + CLIENTS.incrementAndGet();
        private final Map<String, Cookie> cookies = new LinkedHashMap<>();

        private MvcResult post(String path, Map<String, ?> data, boolean withCsrf) throws Exception {
            var request = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(ROOT + path)
                    .with(servletRequest -> { servletRequest.setRemoteAddr(ip); return servletRequest; });
            if (withCsrf) {
                var issue = get(ROOT + "/csrf");
                if (!cookies.isEmpty()) issue.cookie(cookies.values().toArray(Cookie[]::new));
                var csrf = mvc.perform(issue).andExpect(status().isOk()).andReturn();
                acceptCookies(csrf);
                var token = body(csrf);
                request.header(token.get("headerName").asString(), token.get("token").asString());
            }
            if (!cookies.isEmpty()) request.cookie(cookies.values().toArray(Cookie[]::new));
            if (data != null) request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(data));
            var response = mvc.perform(request).andReturn();
            acceptCookies(response);
            return response;
        }

        private void acceptCookies(MvcResult result) {
            for (Cookie cookie : result.getResponse().getCookies()) {
                if (cookie.getMaxAge() == 0) cookies.remove(cookie.getName());
                else cookies.put(cookie.getName(), cookie);
            }
        }
    }
}
