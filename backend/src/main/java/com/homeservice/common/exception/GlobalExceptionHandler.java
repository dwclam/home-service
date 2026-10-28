package com.homeservice.common.exception;

import com.homeservice.common.dto.ApiError;
import com.homeservice.auth.exception.AuthException;
import com.homeservice.auth.exception.LoginRateLimitException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiError> handleBusinessException(BusinessException exception) {
        ApiError error = new ApiError("BUSINESS_ERROR", exception.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleResourceNotFoundException(ResourceNotFoundException exception) {
        ApiError error = new ApiError("NOT_FOUND", exception.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(LoginRateLimitException.class)
    ResponseEntity<ApiError> handleLoginRateLimit(LoginRateLimitException exception) {
        return ResponseEntity.status(exception.getStatus())
                .header(HttpHeaders.RETRY_AFTER, Long.toString(exception.getRetryAfterSeconds()))
                .body(new ApiError(exception.getCode(), exception.getMessage()));
    }

    @ExceptionHandler(AuthException.class)
    ResponseEntity<ApiError> handleAuth(AuthException exception) {
        return ResponseEntity.status(exception.getStatus()).body(new ApiError(exception.getCode(), exception.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiError> handleDataConflict(DataIntegrityViolationException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiError("DATA_CONFLICT", "Dữ liệu bị trùng hoặc không thỏa mãn ràng buộc."));
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception, HttpHeaders headers,
            HttpStatusCode status, WebRequest request
    ) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error -> fieldErrors.putIfAbsent(
                error.getField(), error.getDefaultMessage() == null ? "Không hợp lệ." : error.getDefaultMessage()));
        ApiError body = new ApiError("VALIDATION_ERROR", "Dữ liệu gửi lên không hợp lệ.", fieldErrors);
        return super.handleExceptionInternal(exception, body, headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception exception, Object body, HttpHeaders headers,
            HttpStatusCode status, WebRequest request
    ) {
        if (body instanceof ApiError) {
            return super.handleExceptionInternal(exception, body, headers, status, request);
        }
        ApiError error = switch (status.value()) {
            case 400 -> new ApiError("BAD_REQUEST", "Yêu cầu không hợp lệ.");
            case 404 -> new ApiError("NOT_FOUND", "Không tìm thấy tài nguyên.");
            case 405 -> new ApiError("METHOD_NOT_ALLOWED", "Phương thức HTTP không được hỗ trợ.");
            case 415 -> new ApiError("UNSUPPORTED_MEDIA_TYPE", "Định dạng dữ liệu không được hỗ trợ.");
            default -> new ApiError("REQUEST_FAILED", "Không thể xử lý yêu cầu.");
        };
        return super.handleExceptionInternal(exception, error, headers, status, request);
    }
}
