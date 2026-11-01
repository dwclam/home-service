package com.homeservice.auth.service;

import com.homeservice.config.properties.AuthProperties;
import org.springframework.stereotype.Component;
import java.time.Clock;
import java.time.Instant;

@Component
public class PendingRegistrationPolicy {
    private final AuthProperties properties;
    private final Clock clock;

    public PendingRegistrationPolicy(AuthProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public Instant deadline(Instant createdAt) { return createdAt.plus(properties.pendingRegistrationTtl()); }
    public boolean expired(Instant createdAt) { return !clock.instant().isBefore(deadline(createdAt)); }
    public Instant otpExpiry(Instant sentAt, Instant createdAt) {
        Instant otpExpiry = sentAt.plus(properties.otpTtl());
        Instant deadline = deadline(createdAt);
        return otpExpiry.isBefore(deadline) ? otpExpiry : deadline;
    }
}
