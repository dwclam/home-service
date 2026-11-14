package com.homeservice.config;

import com.homeservice.config.properties.AuthProperties;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;
import org.springframework.context.annotation.Configuration;
import java.time.Duration;
import static org.assertj.core.api.Assertions.assertThat;

class PendingRegistrationPropertiesTests {
    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(AuthProperties.class)
    static class PropertiesConfig { }

    private ApplicationContextRunner runner() {
        return new ApplicationContextRunner().withUserConfiguration(PropertiesConfig.class)
                .withConfiguration(AutoConfigurations.of(ValidationAutoConfiguration.class))
                .withPropertyValues("app.auth.otp-ttl=10m", "app.auth.otp-resend-interval=60s", "app.auth.otp-max-attempts=5");
    }

    @Test
    void bindingUsesDefaultsAndRejectsInvalidValuesAtStartup() {
        runner().run(context -> {
            assertThat(context).hasNotFailed();
            var properties = context.getBean(AuthProperties.class);
            assertThat(properties.pendingRegistrationTtl()).isEqualTo(Duration.ofHours(24));
            assertThat(properties.pendingCleanup().enabled()).isTrue();
            assertThat(properties.pendingCleanup().interval()).isEqualTo(Duration.ofHours(1));
            assertThat(properties.pendingCleanup().batchSize()).isEqualTo(100);
        });
        for (String property : new String[]{"app.auth.pending-registration-ttl=0s", "app.auth.pending-cleanup.interval=-1s", "app.auth.pending-cleanup.batch-size=0"}) {
            runner().withPropertyValues(property).run(context -> assertThat(context).hasFailed());
        }
    }

    @Test
    void rejectsNonPositiveTtlIntervalAndBatchSize() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var invalid = new AuthProperties(Duration.ofMinutes(10), Duration.ofMinutes(1), 5,
                    Duration.ZERO, new AuthProperties.PendingCleanup(true, Duration.ofSeconds(-1), 0));
            assertThat(validator.validate(invalid)).extracting(v -> v.getPropertyPath().toString())
                    .contains("pendingRegistrationTtlValid", "pendingCleanup.intervalValid", "pendingCleanup.batchSize");
            var valid = new AuthProperties(Duration.ofMinutes(10), Duration.ofMinutes(1), 5,
                    Duration.ofHours(24), new AuthProperties.PendingCleanup(true, Duration.ofHours(1), 100));
            assertThat(validator.validate(valid)).isEmpty();
        }
    }
}
