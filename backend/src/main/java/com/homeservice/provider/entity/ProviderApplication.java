package com.homeservice.provider.entity;

import com.homeservice.account.entity.Account;
import com.homeservice.provider.enums.ProviderApplicationStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "provider_applications")
@Getter
@Setter
@NoArgsConstructor
public class ProviderApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", length = 254, nullable = false)
    private String email;

    @Column(name = "applicant_name", length = 150, nullable = false)
    private String applicantName;

    @Column(name = "phone", length = 32, nullable = false)
    private String phone;

    @Column(name = "business_name", length = 200, nullable = false)
    private String businessName;

    @Column(name = "city", length = 150, nullable = false)
    private String city;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "document_url", nullable = false, columnDefinition = "TEXT")
    private String documentUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ProviderApplicationStatus status = ProviderApplicationStatus.PENDING_EMAIL;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by_admin_id")
    private Account decidedByAdmin;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

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
            this.status = ProviderApplicationStatus.PENDING_EMAIL;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
