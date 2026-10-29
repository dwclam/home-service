package com.homeservice.auth.entity;

import com.homeservice.account.enums.AccountType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "email_identities", uniqueConstraints = @UniqueConstraint(
        name = "uk_email_identities_email_type", columnNames = {"email", "account_type"}))
@Getter
@Setter
@NoArgsConstructor
public class EmailIdentity {

    @Id
    @Column(name = "email", length = 254, nullable = false, updatable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false, updatable = false)
    private AccountType accountType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public EmailIdentity(String email, AccountType accountType) {
        this.email = email;
        this.accountType = accountType;
    }

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
