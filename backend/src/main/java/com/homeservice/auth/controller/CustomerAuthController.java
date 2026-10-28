package com.homeservice.auth.controller;

import com.homeservice.auth.dto.request.ResendVerificationRequest;
import com.homeservice.auth.dto.request.LoginRequest;
import com.homeservice.auth.dto.request.RegisterCustomerRequest;
import com.homeservice.auth.dto.request.VerifyEmailRequest;
import com.homeservice.auth.dto.response.AccountResponse;
import com.homeservice.auth.dto.response.LoginResponse;
import com.homeservice.auth.dto.response.RegistrationResponse;
import com.homeservice.auth.exception.InvalidRefreshTokenException;
import com.homeservice.auth.service.CustomerAuthService;
import com.homeservice.auth.service.RefreshTokenService;
import com.homeservice.security.CurrentAccount;
import com.homeservice.security.LoginRateLimiter;
import com.homeservice.security.RefreshTokenCookieService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.bind.annotation.*;

import java.time.Clock;
import java.time.Duration;
import java.time.temporal.ChronoUnit;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class CustomerAuthController {
    private final CustomerAuthService auth;
    private final RefreshTokenCookieService cookies;
    private final RefreshTokenService refreshTokens;
    private final Clock clock;
    private final CookieCsrfTokenRepository csrf;
    private final LoginRateLimiter loginRateLimiter;

    @ModelAttribute
    void preventCaching(HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
    }

    @PostMapping("/register/customer")
    @ResponseStatus(HttpStatus.CREATED)
    public RegistrationResponse register(@Valid @RequestBody RegisterCustomerRequest request) {
        return auth.register(request);
    }

    @PostMapping("/resend-verification")
    public RegistrationResponse resend(@Valid @RequestBody ResendVerificationRequest request) {
        return auth.resendVerification(request.getEmail(), request.getRegistrationToken());
    }

    @PostMapping("/verify-email")
    public AccountResponse verify(@Valid @RequestBody VerifyEmailRequest request) {
        return auth.verifyEmail(request.getEmail(), request.getCode(), request.getRegistrationToken());
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest body,
                               HttpServletRequest request, HttpServletResponse response) {
        loginRateLimiter.check(body.getEmail(), request.getRemoteAddr());
        RefreshTokenService.TokenPair result = auth.login(body.getEmail(), body.getPassword(), cookies.read(request));
        writeRefreshCookie(response, result);
        csrf.saveToken(null, request, response);
        return result.response();
    }

    @PostMapping("/refresh")
    public LoginResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        try {
            RefreshTokenService.TokenPair result = refreshTokens.refresh(cookies.read(request));
            writeRefreshCookie(response, result);
            return result.response();
        } catch (InvalidRefreshTokenException exception) {
            cookies.clear(response);
            throw exception;
        }
    }

    private void writeRefreshCookie(HttpServletResponse response, RefreshTokenService.TokenPair result) {
        cookies.write(response, result.refreshToken(), Duration.between(
                clock.instant().truncatedTo(ChronoUnit.SECONDS), result.refreshExpiresAt()));
    }

    @GetMapping("/me")
    public AccountResponse me(@AuthenticationPrincipal CurrentAccount account) {
        return auth.currentAccount(account.getId());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        refreshTokens.logout(cookies.read(request));
        cookies.clear(response);
        csrf.saveToken(null, request, response);
    }
}
