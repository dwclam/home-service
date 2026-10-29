package com.homeservice.auth.exception;

import org.springframework.http.HttpStatus;

public class LoginRateLimitException extends AuthException {
    private final long retryAfterSeconds;

    public LoginRateLimitException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "LOGIN_RATE_LIMITED",
                "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ và thử lại.");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
