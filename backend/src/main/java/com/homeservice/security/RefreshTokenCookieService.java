package com.homeservice.security;

import com.homeservice.config.properties.AppSecurityProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class RefreshTokenCookieService {
    public static final String COOKIE_NAME = "NESTIFY_REFRESH";
    private final AppSecurityProperties properties;

    public String read(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (COOKIE_NAME.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    public void write(HttpServletResponse response, String token, Duration maxAge) {
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(COOKIE_NAME, token)
                .httpOnly(true).secure(properties.secureCookies()).sameSite("Lax").path("/api/auth")
                .maxAge(maxAge).build().toString());
    }

    public void clear(HttpServletResponse response) {
        write(response, "", Duration.ZERO);
    }
}
