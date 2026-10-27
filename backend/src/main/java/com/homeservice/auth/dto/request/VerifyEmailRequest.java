package com.homeservice.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Locale;

public class VerifyEmailRequest {
    @NotBlank
    @Email
    @Size(max = 254)
    private String email;

    @NotBlank
    @Pattern(regexp = "[0-9]{6}")
    private String code;

    @NotBlank
    @Pattern(regexp = "[A-Za-z0-9_-]{43}")
    private String registrationToken;

    public VerifyEmailRequest() {
    }

    public VerifyEmailRequest(String email, String code, String registrationToken) {
        setEmail(email);
        this.code = code;
        this.registrationToken = registrationToken;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getRegistrationToken() {
        return registrationToken;
    }

    public void setRegistrationToken(String registrationToken) {
        this.registrationToken = registrationToken;
    }

    @Override
    public String toString() {
        return "VerifyEmailRequest[REDACTED]";
    }
}
