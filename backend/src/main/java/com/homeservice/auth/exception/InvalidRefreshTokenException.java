package com.homeservice.auth.exception;

import org.springframework.http.HttpStatus;

public class InvalidRefreshTokenException extends AuthException {
    public InvalidRefreshTokenException(boolean reused) {
        super(HttpStatus.UNAUTHORIZED, reused ? "REFRESH_TOKEN_REUSED" : "REFRESH_TOKEN_INVALID",
                "Không thể làm mới đăng nhập. Vui lòng đăng nhập lại.");
    }
}
