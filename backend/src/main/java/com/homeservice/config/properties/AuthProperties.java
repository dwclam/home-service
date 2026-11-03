package com.homeservice.config.properties;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.AssertTrue;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Validated
@ConfigurationProperties("app.auth")
public record AuthProperties(
        @NotNull Duration otpTtl,
        @NotNull Duration otpResendInterval,
        @Min(1) @Max(5) int otpMaxAttempts,
        @NotNull @DefaultValue("24h") Duration pendingRegistrationTtl,
        @Valid @NotNull @DefaultValue PendingCleanup pendingCleanup
) {
    @AssertTrue(message = "OTP TTL must be between 1 second and 10 minutes")
    public boolean isOtpTtlValid() {
        return otpTtl == null || (otpTtl.compareTo(Duration.ofSeconds(1)) >= 0
                && otpTtl.compareTo(Duration.ofMinutes(10)) <= 0);
    }

    @AssertTrue(message = "OTP resend interval must be at least 60 seconds")
    public boolean isOtpResendIntervalValid() {
        return otpResendInterval == null || otpResendInterval.compareTo(Duration.ofSeconds(60)) >= 0;
    }

    @AssertTrue(message = "Pending registration TTL must be positive")
    public boolean isPendingRegistrationTtlValid() {
        return pendingRegistrationTtl == null || (!pendingRegistrationTtl.isZero() && !pendingRegistrationTtl.isNegative());
    }

    public record PendingCleanup(@DefaultValue("true") boolean enabled,
                                 @NotNull @DefaultValue("1h") Duration interval,
                                 @Min(1) @DefaultValue("100") int batchSize) {
        @AssertTrue(message = "Pending cleanup interval must be positive")
        public boolean isIntervalValid() {
            return interval == null || (!interval.isZero() && !interval.isNegative());
        }
    }
}
