package com.homeservice.provider.entity;

import com.homeservice.account.entity.Account;
import com.homeservice.provider.enums.BankVerificationStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "provider_profiles")
@Getter
@Setter
@NoArgsConstructor
public class ProviderProfile {

    @Id
    @Column(name = "account_id")
    private Long accountId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "account_id")
    private Account account;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private ProviderApplication application;

    @Column(name = "business_name", length = 200, nullable = false)
    private String businessName;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "city", length = 150, nullable = false)
    private String city;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "is_visible", nullable = false)
    private Boolean isVisible = true;

    @Column(name = "bank_code", length = 50)
    private String bankCode;

    @Column(name = "bank_account_number_encrypted", columnDefinition = "TEXT")
    private String bankAccountNumberEncrypted;

    @Column(name = "bank_account_holder_name", length = 200)
    private String bankAccountHolderName;

    @Enumerated(EnumType.STRING)
    @Column(name = "bank_verification_status", nullable = false)
    private BankVerificationStatus bankVerificationStatus = BankVerificationStatus.NOT_PROVIDED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_verified_by_admin_id")
    private Account bankVerifiedByAdmin;

    @Column(name = "bank_verified_at")
    private Instant bankVerifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.isVisible == null) {
            this.isVisible = true;
        }
        if (this.bankVerificationStatus == null) {
            this.bankVerificationStatus = BankVerificationStatus.NOT_PROVIDED;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
