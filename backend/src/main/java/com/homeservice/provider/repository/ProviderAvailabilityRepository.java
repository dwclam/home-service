package com.homeservice.provider.repository;

import com.homeservice.provider.entity.ProviderAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ProviderAvailabilityRepository extends JpaRepository<ProviderAvailability, Long> {

    List<ProviderAvailability> findByProviderAccountId(Long providerId);

    @Query(value = "SELECT COUNT(*) > 0 FROM provider_availability " +
                   "WHERE provider_id = :providerId " +
                   "AND state = 'AVAILABLE' " +
                   "AND starts_at <= :startsAt AND ends_at >= :endsAt", nativeQuery = true)
    boolean isCoveredByAvailableSlot(
            @Param("providerId") Long providerId,
            @Param("startsAt") Instant startsAt,
            @Param("endsAt") Instant endsAt
    );

    @Query(value = "SELECT COUNT(*) > 0 FROM provider_availability " +
                   "WHERE provider_id = :providerId " +
                   "AND state = 'BLOCKED' " +
                   "AND starts_at < :endsAt AND ends_at > :startsAt", nativeQuery = true)
    boolean hasBlockedOverlap(
            @Param("providerId") Long providerId,
            @Param("startsAt") Instant startsAt,
            @Param("endsAt") Instant endsAt
    );
}
