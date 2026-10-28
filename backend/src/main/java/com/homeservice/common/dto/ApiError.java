package com.homeservice.common.dto;

import java.util.Map;

public class ApiError {
    private String code;
    private String message;
    private Map<String, String> fieldErrors = Map.of();

    public ApiError() {
    }

    public ApiError(String code, String message) {
        this(code, message, Map.of());
    }

    public ApiError(String code, String message, Map<String, String> fieldErrors) {
        this.code = code;
        this.message = message;
        this.fieldErrors = fieldErrors;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }

    public void setFieldErrors(Map<String, String> fieldErrors) {
        this.fieldErrors = fieldErrors;
    }
}
