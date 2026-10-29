package com.homeservice.auth.dto.response;

import java.time.Instant;

public class LoginResponse {
    private AccountResponse account;
    private String accessToken;
    private String tokenType;
    private Instant expiresAt;

    public LoginResponse() {
    }

    public LoginResponse(AccountResponse account, String accessToken, String tokenType, Instant expiresAt) {
        this.account = account;
        this.accessToken = accessToken;
        this.tokenType = tokenType;
        this.expiresAt = expiresAt;
    }

    public AccountResponse getAccount() {
        return account;
    }

    public void setAccount(AccountResponse account) {
        this.account = account;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    @Override
    public String toString() {
        return "LoginResponse[REDACTED]";
    }
}
