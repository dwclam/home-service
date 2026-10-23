package com.homeservice.review.entity;

import com.homeservice.account.entity.Account;
import com.homeservice.booking.entity.Booking;
import com.homeservice.review.enums.ReviewStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "reviews")
@Getter
@Setter
@NoArgsConstructor
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @Column(name = "rating", nullable = false)
    private Integer rating;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ReviewStatus status = ReviewStatus.VISIBLE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hidden_by_admin_id")
    private Account hiddenByAdmin;

    @Column(name = "hidden_at")
    private Instant hiddenAt;

    @Column(name = "hidden_reason", columnDefinition = "TEXT")
    private String hiddenReason;

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
            this.status = ReviewStatus.VISIBLE;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
