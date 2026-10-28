package com.homeservice.auth.exception;

import org.springframework.http.HttpStatus;

/** A rejected attempt must still commit its counter/invalidation. */
public class InvalidOtpException extends AuthException {
    public InvalidOtpException(boolean exhausted) {
        super(exhausted ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.BAD_REQUEST,
                exhausted ? "OTP_ATTEMPTS_EXCEEDED" : "OTP_INVALID",
                exhausted ? "Đã hết số lần thử. Vui lòng yêu cầu mã mới." : "Mã xác thực không hợp lệ hoặc đã hết hạn.");
    }
}
