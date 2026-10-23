package com.homeservice.payment.entity;

import com.homeservice.payment.enums.GatewayEventProcessingStatus;
import com.homeservice.payment.enums.GatewayEventType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "gateway_events")
@Getter
@Setter
@NoArgsConstructor
public class GatewayEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "processor", length = 30, nullable = false)
    private String processor;

    @Column(name = "event_key", length = 200, nullable = false)
    private String eventKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private GatewayEventType eventType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_transaction_id")
    private PaymentTransaction paymentTransaction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_id")
    private Refund refund;

    @Column(name = "merchant_reference", length = 150)
    private String merchantReference;

    @Column(name = "external_reference", length = 150)
    private String externalReference;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "verified_payload", nullable = false)
    private String verifiedPayload;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false)
    private GatewayEventProcessingStatus processingStatus = GatewayEventProcessingStatus.RECEIVED;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "processing_error", columnDefinition = "TEXT")
    private String processingError;

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
        if (this.receivedAt == null) {
            this.receivedAt = now;
        }
        if (this.processingStatus == null) {
            this.processingStatus = GatewayEventProcessingStatus.RECEIVED;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
