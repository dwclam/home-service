package com.homeservice.provider.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.homeservice.provider.enums.ProviderApplicationStatus;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProviderApplicationResponse {
    private String email;
    private ProviderApplicationStatus status;
    private String registrationToken;
    private Instant expiresAt;
    private Instant resendAvailableAt;

    public ProviderApplicationResponse() {
    }

    public ProviderApplicationResponse(String email, ProviderApplicationStatus status,
                                       String registrationToken, Instant expiresAt, Instant resendAvailableAt) {
        this.email = email;
        this.status = status;
        this.registrationToken = registrationToken;
        this.expiresAt = expiresAt;
        this.resendAvailableAt = resendAvailableAt;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public ProviderApplicationStatus getStatus() { return status; }
    public void setStatus(ProviderApplicationStatus status) { this.status = status; }
    public String getRegistrationToken() { return registrationToken; }
    public void setRegistrationToken(String token) { registrationToken = token; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getResendAvailableAt() { return resendAvailableAt; }
    public void setResendAvailableAt(Instant resendAvailableAt) { this.resendAvailableAt = resendAvailableAt; }

    @Override
    public String toString() { return "ProviderApplicationResponse[REDACTED]"; }
}
