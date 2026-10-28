package com.homeservice.config.properties;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Validated
@ConfigurationProperties("app.auth.login-rate-limit")
public record LoginRateLimitProperties(
        @Min(1) @Max(100) int maxAttemptsPerEmailAndIp,
        @Min(1) @Max(1000) int maxAttemptsPerIp,
        @NotNull Duration window
) {
    @AssertTrue(message = "Login rate limit window must be whole seconds between 1 second and 1 hour")
    public boolean isWindowValid() {
        return window == null || (window.getNano() == 0
                && window.compareTo(Duration.ofSeconds(1)) >= 0
                && window.compareTo(Duration.ofHours(1)) <= 0);
    }

    @AssertTrue(message = "IP login limit must be at least the email/IP limit")
    public boolean isIpLimitValid() {
        return maxAttemptsPerIp >= maxAttemptsPerEmailAndIp;
    }
}
