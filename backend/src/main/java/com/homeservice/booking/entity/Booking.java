package com.homeservice.booking.entity;

import com.homeservice.account.entity.Account;
import com.homeservice.account.entity.CustomerAddress;
import com.homeservice.booking.enums.BookingStatus;
import com.homeservice.booking.enums.SettlementStatus;
import com.homeservice.booking.enums.TerminationKind;
import com.homeservice.booking.enums.TerminationReason;
import com.homeservice.catalog.entity.ServiceOffering;
import com.homeservice.common.enums.ActorType;
import com.homeservice.provider.entity.ProviderProfile;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_code", length = 40, nullable = false, unique = true)
    private String bookingCode;

    @Column(name = "client_request_key", nullable = false)
    private UUID clientRequestKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Account customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    private ProviderProfile provider;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceOffering service;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "address_id")
    private CustomerAddress address;

    @Column(name = "service_title_snapshot", length = 200, nullable = false)
    private String serviceTitleSnapshot;

    @Column(name = "duration_minutes_snapshot", nullable = false)
    private Integer durationMinutesSnapshot;

    @Column(name = "recipient_name", length = 150, nullable = false)
    private String recipientName;

    @Column(name = "recipient_phone", length = 32, nullable = false)
    private String recipientPhone;

    @Column(name = "address_line", nullable = false, columnDefinition = "TEXT")
    private String addressLine;

    @Column(name = "ward", length = 150)
    private String ward;

    @Column(name = "city", length = 150, nullable = false)
    private String city;

    @Column(name = "address_instructions", columnDefinition = "TEXT")
    private String addressInstructions;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private BookingStatus status = BookingStatus.PENDING_PROVIDER;

    @Column(name = "request_expires_at", nullable = false)
    private Instant requestExpiresAt;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Column(name = "deposit_due_at")
    private Instant depositDueAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "balance_due_at")
    private Instant balanceDueAt;

    @Column(name = "total_amount_vnd", nullable = false)
    private Long totalAmountVnd;

    @Column(name = "deposit_percent", nullable = false)
    private Integer depositPercent = 30;

    @Column(name = "deposit_amount_vnd", nullable = false)
    private Long depositAmountVnd;

    @Column(name = "balance_amount_vnd", nullable = false)
    private Long balanceAmountVnd;

    @Column(name = "platform_fee_percent", nullable = false)
    private Integer platformFeePercent = 20;

    @Column(name = "cancel_cutoff_minutes", nullable = false)
    private Integer cancelCutoffMinutes = 30;

    @Column(name = "early_refund_percent", nullable = false)
    private Integer earlyRefundPercent = 50;

    @Column(name = "late_refund_percent", nullable = false)
    private Integer lateRefundPercent = 0;

    @Column(name = "provider_refund_percent", nullable = false)
    private Integer providerRefundPercent = 100;

    @Column(name = "system_refund_percent", nullable = false)
    private Integer systemRefundPercent = 100;

    @Enumerated(EnumType.STRING)
    @Column(name = "termination_kind")
    private TerminationKind terminationKind;

    @Enumerated(EnumType.STRING)
    @Column(name = "termination_actor_type")
    private ActorType terminationActorType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "terminated_by_account_id")
    private Account terminatedByAccount;

    @Enumerated(EnumType.STRING)
    @Column(name = "termination_reason_code")
    private TerminationReason terminationReasonCode;

    @Column(name = "termination_reason", columnDefinition = "TEXT")
    private String terminationReason;

    @Column(name = "terminated_at")
    private Instant terminatedAt;

    @Column(name = "refund_percent")
    private Integer refundPercent;

    @Column(name = "gross_collected_vnd")
    private Long grossCollectedVnd;

    @Column(name = "refunded_vnd")
    private Long refundedVnd;

    @Column(name = "net_retained_vnd")
    private Long netRetainedVnd;

    @Column(name = "platform_fee_vnd")
    private Long platformFeeVnd;

    @Column(name = "provider_due_vnd")
    private Long providerDueVnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_status", nullable = false)
    private SettlementStatus settlementStatus = SettlementStatus.DRAFT;

    @Column(name = "settlement_note", columnDefinition = "TEXT")
    private String settlementNote;

    @Column(name = "settled_at")
    private Instant settledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "settled_by_admin_id")
    private Account settledByAdmin;

    @Column(name = "customer_note", columnDefinition = "TEXT")
    private String customerNote;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

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
            this.status = BookingStatus.PENDING_PROVIDER;
        }
        if (this.settlementStatus == null) {
            this.settlementStatus = SettlementStatus.DRAFT;
        }
        if (this.depositPercent == null) {
            this.depositPercent = 30;
        }
        if (this.platformFeePercent == null) {
            this.platformFeePercent = 20;
        }
        if (this.cancelCutoffMinutes == null) {
            this.cancelCutoffMinutes = 30;
        }
        if (this.earlyRefundPercent == null) {
            this.earlyRefundPercent = 50;
        }
        if (this.lateRefundPercent == null) {
            this.lateRefundPercent = 0;
        }
        if (this.providerRefundPercent == null) {
            this.providerRefundPercent = 100;
        }
        if (this.systemRefundPercent == null) {
            this.systemRefundPercent = 100;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
