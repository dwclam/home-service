package com.homeservice.config;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountType;
import com.homeservice.auth.service.JwtTokenService;
import com.homeservice.config.properties.JwtProperties;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:nestify-first-password-security-test;DB_CLOSE_DELAY=-1",
        "app.jwt.first-password-change-ttl=3m"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FirstPasswordChangeSecurityTests {
    private static final String FIRST_PASSWORD = "/api/auth/provider/first-password";
    private static final Instant NOW = Instant.parse("2026-11-15T00:00:00Z");
    private static final long ACCOUNT_ID = 7L;

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JwtTokenService tokens;
    @Autowired JwtProperties properties;
    @Autowired @Qualifier("accessJwtEncoder") JwtEncoder accessEncoder;
    @Autowired @Qualifier("refreshJwtEncoder") JwtEncoder refreshEncoder;
    @Autowired @Qualifier("firstPasswordChangeJwtDecoder") JwtDecoder passwordChangeDecoder;
    @MockitoBean Clock clock;

    @BeforeEach
    void setClock() {
        when(clock.instant()).thenReturn(NOW);
    }

    @Test
    void tokenHasDedicatedPurposeAndConfiguredExpiryWithoutBusinessClaims() {
        var issued = tokens.issueFirstPasswordChange(ACCOUNT_ID);
        var decoded = passwordChangeDecoder.decode(issued.getTokenValue());

        assertThat(decoded.getClaims()).containsOnlyKeys("iss", "sub", "aud", "iat", "exp", "jti", "token_use");
        assertThat(decoded.getSubject()).isEqualTo(Long.toString(ACCOUNT_ID));
        assertThat(decoded.getAudience()).containsExactly("nestify-first-password");
        assertThat(decoded.getClaimAsString("token_use")).isEqualTo("first_password_change");
        assertThat(decoded.getClaimAsString("iss")).isEqualTo(properties.issuer());
        assertThat(decoded.getExpiresAt()).isEqualTo(NOW.plus(Duration.ofMinutes(3)));
    }

    @Test
    void signedClaimsMustMatchPurposeIssuerAudienceSubjectAndTimeBounds() {
        Map<String, Object> claims = new LinkedHashMap<>(tokens.issueFirstPasswordChange(ACCOUNT_ID).getClaims());
        assertThat(passwordChangeDecoder.decode(encode(accessEncoder, claims)).getSubject()).isEqualTo("7");
        assertThatThrownBy(() -> passwordChangeDecoder.decode(encode(refreshEncoder, claims)))
                .isInstanceOf(JwtException.class);

        var invalidClaims = Map.ofEntries(
                Map.entry("iss", "another-issuer"),
                Map.entry("aud", List.of("nestify-api")),
                Map.entry("token_use", "access"),
                Map.entry("sub", "0"),
                Map.entry("jti", "invalid-id"),
                Map.entry("iat", NOW.plusSeconds(1)),
                Map.entry("exp", NOW.plus(Duration.ofMinutes(3)).plusSeconds(1)),
                Map.entry("role", "PROVIDER"));
        invalidClaims.forEach((key, value) -> {
            var invalid = new LinkedHashMap<>(claims);
            invalid.put(key, value);
            assertThatThrownBy(() -> passwordChangeDecoder.decode(encode(accessEncoder, invalid)))
                    .as("invalid %s", key).isInstanceOf(JwtException.class);
        });

        for (String key : claims.keySet()) {
            var missing = new LinkedHashMap<>(claims);
            missing.put("exp", NOW.plusSeconds(1));
            missing.remove(key);
            assertThatThrownBy(() -> passwordChangeDecoder.decode(encode(accessEncoder, missing)))
                    .as("missing %s", key).isInstanceOf(JwtException.class);
        }
    }

    @Test
    void passwordChangeAcceptsValidTokenAndRejectsItAtExactExpiry() throws Exception {
        var token = tokens.issueFirstPasswordChange(ACCOUNT_ID);
        when(clock.instant()).thenReturn(token.getExpiresAt().minusNanos(1));
        mvc.perform(withCsrf(post(FIRST_PASSWORD))
                        .header(HttpHeaders.AUTHORIZATION, bearer(token.getTokenValue()))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        when(clock.instant()).thenReturn(token.getExpiresAt());
        mvc.perform(withCsrf(post(FIRST_PASSWORD))
                        .header(HttpHeaders.AUTHORIZATION, bearer(token.getTokenValue())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_TOKEN_INVALID"));
    }

    @Test
    void passwordChangeRejectsMissingMalformedAccessAndRefreshBearerTokens() throws Exception {
        var account = new Account();
        account.setId(ACCOUNT_ID);
        account.setAccountType(AccountType.PROVIDER);
        var access = tokens.issueAccess(account);
        var refresh = tokens.issueRefresh(ACCOUNT_ID, UUID.randomUUID(), NOW.plus(properties.refreshTtl()));

        mvc.perform(withCsrf(post(FIRST_PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_TOKEN_INVALID"));
        for (String authorization : List.of("Bearer invalid value", bearer(access.getTokenValue()),
                bearer(refresh.getTokenValue()))) {
            mvc.perform(withCsrf(post(FIRST_PASSWORD)).header(HttpHeaders.AUTHORIZATION, authorization))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_TOKEN_INVALID"));
        }
    }

    @Test
    void passwordChangeRequiresMatchingCsrfEvenWithValidBearer() throws Exception {
        String authorization = bearer(tokens.issueFirstPasswordChange(ACCOUNT_ID).getTokenValue());
        mvc.perform(post(FIRST_PASSWORD).header(HttpHeaders.AUTHORIZATION, authorization))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));

        var csrfResponse = mvc.perform(get("/api/auth/csrf")).andReturn().getResponse();
        var csrf = json.readTree(csrfResponse.getContentAsString());
        mvc.perform(post(FIRST_PASSWORD).cookie(new Cookie("XSRF-TOKEN", UUID.randomUUID().toString()))
                        .header(csrf.get("headerName").asText(), csrf.get("token").asText())
                        .header(HttpHeaders.AUTHORIZATION, authorization))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/auth/me", "/api/admin/provider-applications", "/api/provider/probe",
            "/api/v1/provider/probe", "/api/unscoped-probe", FIRST_PASSWORD})
    void scopedBearerDoesNotAuthenticateOtherRoutesOrMethods(String path) throws Exception {
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION,
                        bearer(tokens.issueFirstPasswordChange(ACCOUNT_ID).getTokenValue())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void passwordChangeTokenCannotStandInForRefreshCookie() throws Exception {
        String token = tokens.issueFirstPasswordChange(ACCOUNT_ID).getTokenValue();
        mvc.perform(withCsrf(post("/api/auth/refresh")).cookie(new Cookie("NESTIFY_REFRESH", token)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("REFRESH_TOKEN_INVALID"));
    }

    private String encode(JwtEncoder encoder, Map<String, Object> claims) {
        var header = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
        return encoder.encode(JwtEncoderParameters.from(header,
                JwtClaimsSet.builder().claims(values -> values.putAll(claims)).build())).getTokenValue();
    }

    private MockHttpServletRequestBuilder withCsrf(MockHttpServletRequestBuilder request) throws Exception {
        var response = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn().getResponse();
        var csrf = json.readTree(response.getContentAsString());
        return request.cookie(response.getCookie("XSRF-TOKEN"))
                .header(csrf.get("headerName").asText(), csrf.get("token").asText());
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
