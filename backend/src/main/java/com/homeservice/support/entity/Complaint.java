package com.homeservice.support.entity;

import com.homeservice.account.entity.Account;
import com.homeservice.booking.entity.Booking;
import com.homeservice.support.enums.ComplaintCategory;
import com.homeservice.support.enums.ComplaintStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "complaints")
@Getter
@Setter
@NoArgsConstructor
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Account customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_admin_id")
    private Account assignedAdmin;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private ComplaintCategory category;

    @Column(name = "subject", length = 200, nullable = false)
    private String subject;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ComplaintStatus status = ComplaintStatus.OPEN;

    @Column(name = "resolution", columnDefinition = "TEXT")
    private String resolution;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

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
            this.status = ComplaintStatus.OPEN;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
