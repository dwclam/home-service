package com.homeservice.security;

import com.homeservice.auth.exception.LoginRateLimitException;
import com.homeservice.config.properties.LoginRateLimitProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LoginRateLimiterTests {
    private static final Instant START = Instant.parse("2026-10-27T00:00:00Z");
    private Clock clock;
    private LoginRateLimiter limiter;

    @BeforeEach
    void setUp() {
        clock = mock(Clock.class);
        when(clock.instant()).thenReturn(START);
        limiter = new LoginRateLimiter(new LoginRateLimitProperties(5, 30, Duration.ofMinutes(1)), clock);
    }

    @Test
    void normalizesEmailAndRestoresQuotaAtTheWindowBoundary() {
        for (int i = 0; i < 5; i++) limiter.check("user@example.com", "192.0.2.1");
        when(clock.instant()).thenReturn(START.plusMillis(200));
        assertThatThrownBy(() -> limiter.check(" USER@EXAMPLE.COM ", "192.0.2.1"))
                .isInstanceOfSatisfying(LoginRateLimitException.class,
                        error -> assertThat(error.getRetryAfterSeconds()).isEqualTo(60));
        limiter.check("user@example.com", "192.0.2.2");

        when(clock.instant()).thenReturn(START.plusSeconds(60));
        limiter.check("user@example.com", "192.0.2.1");
    }

    @Test
    void rotatingEmailsCannotBypassTheIpLimit() {
        for (int i = 0; i < 30; i++) limiter.check("user" + i + "@example.com", "192.0.2.1");
        assertThatThrownBy(() -> limiter.check("another@example.com", "192.0.2.1"))
                .isInstanceOf(LoginRateLimitException.class);
        limiter.check("another@example.com", "192.0.2.2");
    }

    @Test
    void rejectedEmailAttemptsStillConsumeTheIpQuota() {
        limiter = new LoginRateLimiter(new LoginRateLimitProperties(1, 3, Duration.ofMinutes(1)), clock);
        limiter.check("user@example.com", "192.0.2.1");
        assertThatThrownBy(() -> limiter.check("user@example.com", "192.0.2.1"))
                .isInstanceOf(LoginRateLimitException.class);
        limiter.check("second@example.com", "192.0.2.1");
        assertThatThrownBy(() -> limiter.check("third@example.com", "192.0.2.1"))
                .isInstanceOf(LoginRateLimitException.class);
    }

    @Test
    void concurrentRequestsCannotExceedTheQuota() throws Exception {
        try (var executor = Executors.newFixedThreadPool(8)) {
            var calls = IntStream.range(0, 30).mapToObj(i -> (Callable<Boolean>) () -> {
                try {
                    limiter.check("user@example.com", "192.0.2.1");
                    return true;
                } catch (LoginRateLimitException exception) {
                    return false;
                }
            }).toList();
            int allowed = 0;
            for (var result : executor.invokeAll(calls)) {
                if (result.get()) allowed++;
            }
            assertThat(allowed).isEqualTo(5);
        }
    }

    @Test
    void boundedStorageDoesNotEvictActiveLimitsAndReclaimsExpiredClients() {
        for (int i = 0; i < 10_000; i++) limiter.check("user@example.com", "client-" + i);
        assertThatThrownBy(() -> limiter.check("user@example.com", "new-client"))
                .isInstanceOf(LoginRateLimitException.class);
        limiter.check("user@example.com", "client-0");

        when(clock.instant()).thenReturn(START.plusSeconds(60));
        limiter.check("user@example.com", "new-client");
    }
}
