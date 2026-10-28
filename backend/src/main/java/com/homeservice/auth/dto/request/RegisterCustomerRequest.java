package com.homeservice.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Locale;

public class RegisterCustomerRequest {
    @NotBlank
    @Email
    @Size(max = 254)
    private String email;

    @NotBlank
    @Size(min = 8, max = 72)
    private String password;

    @NotBlank
    @Size(max = 150)
    private String displayName;

    @Size(max = 32)
    private String phone;

    public RegisterCustomerRequest() {
    }

    public RegisterCustomerRequest(String email, String password, String displayName, String phone) {
        setEmail(email);
        this.password = password;
        setDisplayName(displayName);
        setPhone(phone);
    }
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName == null ? null : displayName.strip();
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone == null || phone.isBlank() ? null : phone.strip();
    }

    @Override
    public String toString() {
        return "RegisterCustomerRequest[REDACTED]";
    }
}
