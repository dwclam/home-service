package com.homeservice.auth.dto.response;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.time.Instant;

@Getter
@RequiredArgsConstructor
public class FirstPasswordChangeResponse {
    private final String passwordChangeToken;
    private final Instant expiresAt;

    public boolean isMustChangePassword() {
        return true;
    }

    @Override
    public String toString() {
        return "FirstPasswordChangeResponse[REDACTED]";
    }
}
