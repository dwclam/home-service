package com.homeservice.payment.entity;

import com.homeservice.booking.entity.Booking;
import com.homeservice.payment.enums.PaymentAllocationStatus;
import com.homeservice.payment.enums.PaymentKind;
import com.homeservice.payment.enums.PaymentStatus;
import com.homeservice.payment.enums.RefundReason;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
@NoArgsConstructor
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private PaymentKind kind;

    @Column(name = "processor", length = 30, nullable = false)
    private String processor;

    @Column(name = "merchant_reference", length = 100, nullable = false, unique = true)
    private String merchantReference;

    @Column(name = "external_transaction_id", length = 150)
    private String externalTransactionId;

    @Column(name = "client_request_key", nullable = false)
    private UUID clientRequestKey;

    @Column(name = "expected_amount_vnd", nullable = false)
    private Long expectedAmountVnd;

    @Column(name = "received_amount_vnd")
    private Long receivedAmountVnd;

    @Column(name = "processing_fee_vnd")
    private Long processingFeeVnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PaymentStatus status = PaymentStatus.CREATED;

    @Enumerated(EnumType.STRING)
    @Column(name = "allocation_status")
    private PaymentAllocationStatus allocationStatus;

    @Column(name = "refund_due_vnd")
    private Long refundDueVnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_reason")
    private RefundReason refundReason;

    @Column(name = "gateway_paid_at")
    private Instant gatewayPaidAt;

    @Column(name = "succeeded_at")
    private Instant succeededAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

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
            this.status = PaymentStatus.CREATED;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
