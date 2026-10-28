package com.homeservice.config.properties;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Validated
@ConfigurationProperties("app.jwt")
public record JwtProperties(
        @NotBlank String issuer,
        @NotBlank String accessSecret,
        @NotBlank String refreshSecret,
        @NotNull Duration accessTtl,
        @NotNull Duration refreshTtl
) {
    @AssertTrue(message = "Access TTL must be whole seconds between 1 second and 15 minutes")
    public boolean isAccessTtlValid() {
        return validDuration(accessTtl, Duration.ofMinutes(15));
    }

    @AssertTrue(message = "Refresh TTL must be whole seconds between access TTL and 14 days")
    public boolean isRefreshTtlValid() {
        return validDuration(refreshTtl, Duration.ofDays(14))
                && (refreshTtl == null || accessTtl == null || refreshTtl.compareTo(accessTtl) > 0);
    }

    private boolean validDuration(Duration value, Duration maximum) {
        return value == null || (value.getNano() == 0 && value.compareTo(Duration.ofSeconds(1)) >= 0
                && value.compareTo(maximum) <= 0);
    }

    @Override
    public String toString() {
        return "JwtProperties[REDACTED]";
    }
}
