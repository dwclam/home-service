package com.homeservice.auth;

import com.homeservice.auth.dto.response.LoginResponse;
import com.homeservice.auth.exception.AuthException;
import com.homeservice.auth.service.CustomerAuthService;
import com.homeservice.auth.service.RefreshTokenService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(properties = {
        "app.auth.login-rate-limit.max-attempts-per-email-and-ip=2",
        "app.auth.login-rate-limit.max-attempts-per-ip=3",
        "app.auth.login-rate-limit.window=1m"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LoginRateLimitIntegrationTests {
    private static final AtomicInteger CLIENTS = new AtomicInteger();

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean CustomerAuthService auth;
    @MockitoBean Clock clock;

    private Instant now;
    private String clientIp;

    @BeforeEach
    void setUp() {
        now = Instant.parse("2026-10-27T00:00:00Z");
        clientIp = "192.0.2." + CLIENTS.incrementAndGet();
        when(clock.instant()).thenAnswer(invocation -> now);
        when(auth.login(anyString(), anyString(), nullable(String.class)))
                .thenThrow(new AuthException(HttpStatus.UNAUTHORIZED,
                        "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng."));
    }

    @Test
    void blocksBeforeAuthenticationAndReturnsReadableRetryAfter() throws Exception {
        assertStatus(login("user@example.com", clientIp), 401);
        assertStatus(login("user@example.com", clientIp), 401);

        MvcResult limited = login(" USER@EXAMPLE.COM ", clientIp);
        assertStatus(limited, 429);
        assertThat(json.readTree(limited.getResponse().getContentAsString()).get("code").asString())
                .isEqualTo("LOGIN_RATE_LIMITED");
        assertThat(limited.getResponse().getHeader(HttpHeaders.RETRY_AFTER)).isEqualTo("60");
        assertThat(limited.getResponse().getHeader(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS))
                .contains("Retry-After");
        verify(auth, times(2)).login(anyString(), anyString(), nullable(String.class));

        now = now.plusSeconds(30);
        assertThat(login("user@example.com", clientIp).getResponse().getHeader(HttpHeaders.RETRY_AFTER))
                .isEqualTo("30");
        now = now.plusSeconds(30);
        assertStatus(login("user@example.com", clientIp), 401);
        verify(auth, times(3)).login(anyString(), anyString(), nullable(String.class));
    }

    @Test
    void changingEmailsOrForwardedHeadersCannotBypassTheIpLimit() throws Exception {
        for (int i = 0; i < 3; i++) {
            assertStatus(login("user" + i + "@example.com", clientIp), 401);
        }
        assertStatus(login("another@example.com", clientIp), 429);
        assertStatus(login("another@example.com", "198.51.100.1"), 401);
        verify(auth, times(4)).login(anyString(), anyString(), nullable(String.class));
    }

    @Test
    void successfulLoginsAlsoConsumeTheQuota() throws Exception {
        var response = new LoginResponse(null, "access-token", "Bearer", now.plusSeconds(900));
        doReturn(new RefreshTokenService.TokenPair(response, "refresh-token", now.plus(Duration.ofDays(14))))
                .when(auth).login(anyString(), anyString(), nullable(String.class));

        assertStatus(login("user@example.com", clientIp), 200);
        assertStatus(login("user@example.com", clientIp), 200);
        assertStatus(login("user@example.com", clientIp), 429);
        verify(auth, times(2)).login(anyString(), anyString(), nullable(String.class));
    }

    @Test
    void csrfIsStillRequiredAndRejectedRequestsDoNotConsumeTheQuota() throws Exception {
        MvcResult rejected = mvc.perform(post("/api/auth/login")
                .with(request -> { request.setRemoteAddr(clientIp); return request; })
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", "user@example.com", "password", "wrong-password"))))
                .andReturn();
        assertStatus(rejected, 403);
        verifyNoInteractions(auth);
        assertStatus(login("user@example.com", clientIp), 401);
        assertStatus(login("user@example.com", clientIp), 401);
        assertStatus(login("user@example.com", clientIp), 429);
    }

    private MvcResult login(String email, String ip) throws Exception {
        MvcResult csrf = mvc.perform(get("/api/auth/csrf")).andReturn();
        Cookie cookie = csrf.getResponse().getCookie("XSRF-TOKEN");
        String token = json.readTree(csrf.getResponse().getContentAsString()).get("token").asString();
        return mvc.perform(post("/api/auth/login")
                .with(request -> { request.setRemoteAddr(ip); return request; })
                .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                .header("X-Forwarded-For", "203.0.113." + CLIENTS.incrementAndGet())
                .header("X-XSRF-TOKEN", token)
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", "wrong-password"))))
                .andReturn();
    }

    private void assertStatus(MvcResult result, int status) throws Exception {
        assertThat(result.getResponse().getStatus()).as(result.getResponse().getContentAsString()).isEqualTo(status);
    }
}
