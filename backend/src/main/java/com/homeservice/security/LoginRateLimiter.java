package com.homeservice.security;

import com.homeservice.auth.exception.LoginRateLimitException;
import com.homeservice.config.properties.LoginRateLimitProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/** Fixed windows in this backend instance; requests are counted before password verification. */
@Component
@RequiredArgsConstructor
public class LoginRateLimiter {
    private static final int MAX_TRACKED_IPS = 10_000;

    private final LoginRateLimitProperties properties;
    private final Clock clock;
    private final Map<String, ClientWindow> clients = new HashMap<>();
    private Instant nextCleanup = Instant.MIN;

    public synchronized void check(String email, String clientIp) {
        Instant now = clock.instant();
        if (!now.isBefore(nextCleanup)) {
            removeExpired(now);
            nextCleanup = now.plus(properties.window());
        }

        String ip = clientIp == null ? "unknown" : clientIp;
        ClientWindow window = clients.get(ip);
        if (window == null || !now.isBefore(window.expiresAt)) {
            if (window == null && clients.size() >= MAX_TRACKED_IPS) {
                removeExpired(now);
                if (clients.size() >= MAX_TRACKED_IPS) {
                    // Do not evict active counters: that would let new keys bypass the limits.
                    Instant earliestExpiry = clients.values().stream()
                            .map(client -> client.expiresAt).min(Instant::compareTo).orElseThrow();
                    throw limitedUntil(now, earliestExpiry);
                }
            }
            window = new ClientWindow(now.plus(properties.window()));
            clients.put(ip, window);
        }

        if (window.attempts >= properties.maxAttemptsPerIp()) {
            throw limitedUntil(now, window.expiresAt);
        }
        // Rejected email/IP attempts also consume the IP quota.
        window.attempts++;

        String normalizedEmail = email.strip().toLowerCase(Locale.ROOT);
        int attempts = window.emailAttempts.getOrDefault(normalizedEmail, 0);
        if (attempts >= properties.maxAttemptsPerEmailAndIp()) {
            throw limitedUntil(now, window.expiresAt);
        }
        window.emailAttempts.put(normalizedEmail, attempts + 1);
    }

    private void removeExpired(Instant now) {
        clients.values().removeIf(window -> !now.isBefore(window.expiresAt));
    }

    private LoginRateLimitException limitedUntil(Instant now, Instant expiresAt) {
        Duration remaining = Duration.between(now, expiresAt);
        long seconds = remaining.getSeconds() + (remaining.getNano() == 0 ? 0 : 1);
        return new LoginRateLimitException(Math.max(1, seconds));
    }

    private static final class ClientWindow {
        private final Instant expiresAt;
        private final Map<String, Integer> emailAttempts = new HashMap<>();
        private int attempts;

        private ClientWindow(Instant expiresAt) {
            this.expiresAt = expiresAt;
        }
    }
}
