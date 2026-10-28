package com.homeservice.auth.controller;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;

@RestController
public class CsrfController {

    @GetMapping("/api/auth/csrf")
    public CsrfResponse csrf(CsrfToken token, HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        return new CsrfResponse(token.getHeaderName(), token.getToken());
    }

    public static class CsrfResponse {
        private String headerName;
        private String token;

        public CsrfResponse() {
        }

        public CsrfResponse(String headerName, String token) {
            this.headerName = headerName;
            this.token = token;
        }

        public String getHeaderName() {
            return headerName;
        }

        public void setHeaderName(String headerName) {
            this.headerName = headerName;
        }

        public String getToken() {
            return token;
        }

        public void setToken(String token) {
            this.token = token;
        }
    }
}
