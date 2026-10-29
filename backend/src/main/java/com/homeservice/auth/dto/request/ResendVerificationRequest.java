package com.homeservice.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class ResendVerificationRequest extends EmailRequest {
    @NotBlank
    @Pattern(regexp = "[A-Za-z0-9_-]{43}")
    private String registrationToken;

    public ResendVerificationRequest() {
    }

    public ResendVerificationRequest(String email, String registrationToken) {
        super(email);
        this.registrationToken = registrationToken;
    }

    public String getRegistrationToken() {
        return registrationToken;
    }

    public void setRegistrationToken(String registrationToken) {
        this.registrationToken = registrationToken;
    }

    @Override
    public String toString() {
        return "ResendVerificationRequest[REDACTED]";
    }
}
