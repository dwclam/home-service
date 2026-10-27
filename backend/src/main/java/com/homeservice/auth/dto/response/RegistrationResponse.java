package com.homeservice.auth.dto.response;

import java.time.Instant;

public class RegistrationResponse {
    private String email;
    private String registrationToken;
    private Instant expiresAt;
    private Instant resendAvailableAt;

    public RegistrationResponse() {
    }

    public RegistrationResponse(String email, String registrationToken, Instant expiresAt, Instant resendAvailableAt) {
        this.email = email;
        this.registrationToken = registrationToken;
        this.expiresAt = expiresAt;
        this.resendAvailableAt = resendAvailableAt;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRegistrationToken() {
        return registrationToken;
    }

    public void setRegistrationToken(String registrationToken) {
        this.registrationToken = registrationToken;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getResendAvailableAt() {
        return resendAvailableAt;
    }

    public void setResendAvailableAt(Instant resendAvailableAt) {
        this.resendAvailableAt = resendAvailableAt;
    }

    @Override
    public String toString() {
        return "RegistrationResponse[REDACTED]";
    }
}
