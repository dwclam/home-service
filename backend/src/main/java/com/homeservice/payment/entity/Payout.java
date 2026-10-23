package com.homeservice.payment.entity;

import com.homeservice.account.entity.Account;
import com.homeservice.booking.entity.Booking;
import com.homeservice.payment.enums.PayoutStatus;
import com.homeservice.provider.entity.ProviderProfile;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "payouts")
@Getter
@Setter
@NoArgsConstructor
public class Payout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    private ProviderProfile provider;

    @Column(name = "merchant_transfer_reference", length = 100, nullable = false, unique = true)
    private String merchantTransferReference;

    @Column(name = "transfer_channel_key", length = 64, nullable = false)
    private String transferChannelKey;

    @Column(name = "external_transfer_reference", length = 150)
    private String externalTransferReference;

    @Column(name = "reconciliation_key", length = 200)
    private String reconciliationKey;

    @Column(name = "bank_code_snapshot", length = 50, nullable = false)
    private String bankCodeSnapshot;

    @Column(name = "bank_account_number_encrypted_snapshot", nullable = false, columnDefinition = "TEXT")
    private String bankAccountNumberEncryptedSnapshot;

    @Column(name = "bank_account_holder_name_snapshot", length = 200, nullable = false)
    private String bankAccountHolderNameSnapshot;

    @Column(name = "amount_vnd", nullable = false)
    private Long amountVnd;

    @Column(name = "settled_amount_vnd")
    private Long settledAmountVnd;

    @Column(name = "processing_fee_vnd")
    private Long processingFeeVnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PayoutStatus status = PayoutStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_admin_id", nullable = false)
    private Account approvedByAdmin;

    @Column(name = "approved_at", nullable = false)
    private Instant approvedAt;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt;

    @Column(name = "settled_at")
    private Instant settledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by_admin_id")
    private Account verifiedByAdmin;

    @Column(name = "receipt_url", columnDefinition = "TEXT")
    private String receiptUrl;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

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
        if (this.status == null) {
            this.status = PayoutStatus.PENDING;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
