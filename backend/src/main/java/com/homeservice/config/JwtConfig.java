package com.homeservice.config;

import com.homeservice.config.properties.JwtProperties;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;

import java.time.Clock;
import java.time.Duration;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(JwtProperties.class)
public class JwtConfig {
    public static final String ACCESS_AUDIENCE = "nestify-api";
    public static final String REFRESH_AUDIENCE = "nestify-refresh";
    public static final String FIRST_PASSWORD_CHANGE_AUDIENCE = "nestify-first-password";
    public static final String FIRST_PASSWORD_CHANGE_USE = "first_password_change";

    @Bean
    SecretKey accessSigningKey(JwtProperties properties) {
        SecretKey access = signingKey(properties.accessSecret());
        if (Arrays.equals(access.getEncoded(), signingKey(properties.refreshSecret()).getEncoded())) {
            throw new IllegalArgumentException("JWT access and refresh signing keys must differ");
        }
        return access;
    }

    @Bean
    SecretKey refreshSigningKey(JwtProperties properties) {
        return signingKey(properties.refreshSecret());
    }

    @Bean
    JwtEncoder accessJwtEncoder(@Qualifier("accessSigningKey") SecretKey key) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(key));
    }

    @Bean
    JwtEncoder refreshJwtEncoder(@Qualifier("refreshSigningKey") SecretKey key) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(key));
    }

    @Bean
    JwtDecoder accessJwtDecoder(@Qualifier("accessSigningKey") SecretKey key, JwtProperties properties, Clock clock) {
        return decoder(key, properties, clock, "access", ACCESS_AUDIENCE, properties.accessTtl());
    }

    @Bean
    JwtDecoder refreshJwtDecoder(@Qualifier("refreshSigningKey") SecretKey key, JwtProperties properties, Clock clock) {
        return decoder(key, properties, clock, "refresh", REFRESH_AUDIENCE, properties.refreshTtl());
    }

    @Bean
    JwtDecoder firstPasswordChangeJwtDecoder(@Qualifier("accessSigningKey") SecretKey key,
                                             JwtProperties properties, Clock clock) {
        NimbusJwtDecoder decoder = decoder(key, properties, clock, FIRST_PASSWORD_CHANGE_USE, FIRST_PASSWORD_CHANGE_AUDIENCE,
                properties.firstPasswordChangeTtl());
        var standardClaims = MappedJwtClaimSetConverter.withDefaults(Map.of());
        decoder.setClaimSetConverter(rawClaims -> {
            var claims = standardClaims.convert(rawClaims);
            // Spring supplies a fallback iat from exp. This token requires a signed iat claim.
            if (rawClaims.get(JwtClaimNames.IAT) == null) {
                claims.remove(JwtClaimNames.IAT);
            }
            return claims;
        });
        return decoder;
    }

    private SecretKey signingKey(String encoded) {
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(encoded);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("JWT signing keys must be Base64 encoded");
        }
        if (bytes.length < 32) {
            throw new IllegalArgumentException("JWT signing keys must contain at least 32 random bytes");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    private NimbusJwtDecoder decoder(SecretKey key, JwtProperties properties, Clock clock,
                                    String use, String audience, Duration maximumTtl) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        JwtTimestampValidator timestamps = new JwtTimestampValidator(Duration.ZERO);
        timestamps.setClock(clock);
        OAuth2TokenValidator<Jwt> claims = jwt -> {
            try {
                boolean valid = jwt.getAudience().contains(audience)
                        && use.equals(jwt.getClaimAsString("token_use"))
                        && Long.parseLong(jwt.getSubject()) > 0
                        && UUID.fromString(jwt.getId()).toString().equals(jwt.getId())
                        && jwt.getIssuedAt() != null && jwt.getExpiresAt() != null
                        && !jwt.getIssuedAt().isAfter(clock.instant())
                        && jwt.getExpiresAt().isAfter(clock.instant())
                        && jwt.getExpiresAt().isAfter(jwt.getIssuedAt())
                        && Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt()).compareTo(maximumTtl) <= 0;
                if ("access".equals(use)) {
                    valid &= Set.of("CUSTOMER", "PROVIDER", "ADMIN").contains(jwt.getClaimAsString("role"));
                }
                if (FIRST_PASSWORD_CHANGE_USE.equals(use)) {
                    valid &= jwt.getAudience().equals(List.of(audience)) && !jwt.hasClaim("role");
                }
                if (valid) return OAuth2TokenValidatorResult.success();
            } catch (RuntimeException ignored) {
                // Missing/malformed claims are an invalid credential, never a server error.
            }
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid JWT claims", null));
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                timestamps, new JwtIssuerValidator(properties.issuer()), claims));
        return decoder;
    }
}
