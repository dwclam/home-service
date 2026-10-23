package com.homeservice.config.properties;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.List;

@Validated
@ConfigurationProperties("app.security")
public record AppSecurityProperties(
        @NotEmpty List<@NotBlank String> allowedOrigins,
        boolean secureCookies
) {
}
