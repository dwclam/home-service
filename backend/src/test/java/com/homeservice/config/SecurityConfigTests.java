package com.homeservice.config;

import jakarta.servlet.http.Cookie;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(SecurityConfigTests.ProbeController.class)
class SecurityConfigTests {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    ApplicationContext applicationContext;

    @Test
    void healthIsPublicAndDoesNotCreateServletSession() throws Exception {
        MvcResult result = mvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.service").value("home-service"))
                .andExpect(cookie().doesNotExist("JSESSIONID"))
                .andReturn();
        assertThat(result.getRequest().getSession(false)).isNull();
    }

    @Test
    void protectedEndpointReturnsJson401WithoutRedirectOrBasicChallenge() throws Exception {
        mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"))
                .andExpect(header().doesNotExist(HttpHeaders.LOCATION))
                .andExpect(header().doesNotExist(HttpHeaders.WWW_AUTHENTICATE));
    }

    @Test
    void defaultDevelopmentUserIsNotCreated() {
        assertThat(applicationContext.getBeansOfType(UserDetailsService.class)).isEmpty();
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void customerCannotUseAdminEndpoint() throws Exception {
        mvc.perform(get("/api/admin/probe"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanUseAdminEndpoint() throws Exception {
        mvc.perform(get("/api/admin/probe"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void customerCannotUseProviderEndpoint() throws Exception {
        mvc.perform(get("/api/provider/probe"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    @WithMockUser(roles = "PROVIDER")
    void providerCanUseProviderEndpoint() throws Exception {
        mvc.perform(get("/api/provider/probe"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void methodAuthorizationAlsoApplies() throws Exception {
        mvc.perform(get("/api/probe/admin-method"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void frontendPreflightDoesNotRequireAuthentication() throws Exception {
        mvc.perform(options("/api/auth/login")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "content-type,x-xsrf-token"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    void unknownOriginCannotMakeCredentialedRequests() throws Exception {
        mvc.perform(options("/api/auth/login")
                        .header(HttpHeaders.ORIGIN, "https://untrusted.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @Test
    void csrfEndpointSetsHttpOnlyCookieAndReturnsMaskedTokenWithoutSession() throws Exception {
        MvcResult result = mvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headerName").value("X-XSRF-TOKEN"))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(cookie().httpOnly("XSRF-TOKEN", true))
                .andExpect(cookie().path("XSRF-TOKEN", "/"))
                .andExpect(cookie().secure("XSRF-TOKEN", false))
                .andExpect(cookie().doesNotExist("JSESSIONID"))
                .andReturn();
        assertThat(result.getResponse().getCookie("XSRF-TOKEN").getAttribute("SameSite")).isEqualTo("Lax");
        assertThat(result.getRequest().getSession(false)).isNull();
    }

    @Test
    void loginStillRequiresCsrfEvenThoughItIsPublic() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
    }

    @Test
    void loginIsAllowedThroughSecurityButNotImplementedYet() throws Exception {
        mvc.perform(withCsrfCookie(post("/api/auth/login")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void csrfTokenFromEndpointAllowsWriteWithMatchingCookie() throws Exception {
        MvcResult csrfResponse = mvc.perform(get("/api/auth/csrf")).andReturn();
        JsonNode payload = objectMapper.readTree(csrfResponse.getResponse().getContentAsString());
        Cookie cookie = csrfResponse.getResponse().getCookie("XSRF-TOKEN");

        mvc.perform(post("/api/probe")
                        .cookie(cookie)
                        .header(payload.get("headerName").asText(), payload.get("token").asText())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Lâm\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Lâm"));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void csrfTokenFromAnotherBrowserIsRejected() throws Exception {
        MvcResult first = mvc.perform(get("/api/auth/csrf")).andReturn();
        MvcResult second = mvc.perform(get("/api/auth/csrf")).andReturn();
        JsonNode payload = objectMapper.readTree(first.getResponse().getContentAsString());

        mvc.perform(post("/api/probe")
                        .cookie(second.getResponse().getCookie("XSRF-TOKEN"))
                        .header(payload.get("headerName").asText(), payload.get("token").asText())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Lâm\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void invalidFieldsUseSharedErrorFormat() throws Exception {
        mvc.perform(withCsrfCookie(post("/api/probe"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.name").isNotEmpty());
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void malformedJsonDoesNotExposeParserDetails() throws Exception {
        mvc.perform(withCsrfCookie(post("/api/probe"))
                        .contentType(MediaType.APPLICATION_JSON).content("{invalid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.exception").doesNotExist());
    }

    @Test
    void passwordsAreSaltedAndCheckedAgainstTheirHash() {
        String hash = passwordEncoder.encode("Test-only-password-123!");
        assertThat(hash).isNotEqualTo("Test-only-password-123!");
        assertThat(passwordEncoder.matches("Test-only-password-123!", hash)).isTrue();
        assertThat(passwordEncoder.matches("incorrect", hash)).isFalse();
        assertThat(passwordEncoder.encode("Test-only-password-123!")).isNotEqualTo(hash);
    }

    private MockHttpServletRequestBuilder withCsrfCookie(MockHttpServletRequestBuilder request) throws Exception {
        // Use the real cookie/header flow; csrf() replaces the filter's repository in tests.
        MvcResult response = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn();
        JsonNode token = objectMapper.readTree(response.getResponse().getContentAsString());
        return request.cookie(response.getResponse().getCookie("XSRF-TOKEN"))
                .header(token.get("headerName").asText(), token.get("token").asText());
    }

    @RestController
    static class ProbeController {
        @GetMapping({"/api/admin/probe", "/api/provider/probe"})
        Map<String, String> roleProtected() {
            return Map.of("status", "ok");
        }

        @GetMapping("/api/probe/admin-method")
        @PreAuthorize("hasRole('ADMIN')")
        public Map<String, String> methodProtected() {
            return Map.of("status", "ok");
        }

        @PostMapping("/api/probe")
        public ProbeRequest write(@Valid @RequestBody ProbeRequest request) {
            return request;
        }
    }

    record ProbeRequest(@NotBlank String name) {
    }
}
