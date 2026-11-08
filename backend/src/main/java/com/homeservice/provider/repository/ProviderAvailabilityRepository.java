package com.homeservice.provider.repository;

import com.homeservice.provider.entity.ProviderAvailability;
import com.homeservice.provider.enums.AvailabilityState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProviderAvailabilityRepository extends JpaRepository<ProviderAvailability, Long> {

    List<ProviderAvailability> findByProviderAccountId(Long providerId);

    List<ProviderAvailability> findByProviderAccountIdOrderByStartsAtAsc(Long providerId);

    Optional<ProviderAvailability> findByIdAndProviderAccountId(Long id, Long providerId);

    @Query("SELECT pa FROM ProviderAvailability pa " +
           "WHERE pa.provider.accountId = :providerId " +
           "AND pa.startsAt < :to " +
           "AND pa.endsAt > :from " +
           "ORDER BY pa.startsAt ASC")
    List<ProviderAvailability> findSlotsInRange(
            @Param("providerId") Long providerId,
            @Param("from") Instant from,
            @Param("to") Instant to
    );

    @Query("SELECT pa FROM ProviderAvailability pa " +
           "WHERE pa.provider.accountId = :providerId " +
           "AND pa.state = :state " +
           "AND pa.startsAt <= :endsAt " +
           "AND pa.endsAt >= :startsAt " +
           "ORDER BY pa.startsAt ASC")
    List<ProviderAvailability> findOverlappingOrAbuttingSlots(
            @Param("providerId") Long providerId,
            @Param("state") AvailabilityState state,
            @Param("startsAt") Instant startsAt,
            @Param("endsAt") Instant endsAt
    );

    @Query("SELECT pa FROM ProviderAvailability pa " +
           "WHERE pa.provider.accountId = :providerId " +
           "AND pa.id != :excludedSlotId " +
           "AND pa.state = :state " +
           "AND pa.startsAt <= :endsAt " +
           "AND pa.endsAt >= :startsAt " +
           "ORDER BY pa.startsAt ASC")
    List<ProviderAvailability> findOverlappingOrAbuttingSlotsExcluding(
            @Param("providerId") Long providerId,
            @Param("excludedSlotId") Long excludedSlotId,
            @Param("state") AvailabilityState state,
            @Param("startsAt") Instant startsAt,
            @Param("endsAt") Instant endsAt
    );

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

    /**
     * UC38 — Lấy danh sách slot AVAILABLE của NCC trong phạm vi [from, to),
     * đã sắp xếp theo thời gian bắt đầu tăng dần.
     * Dùng để tính lịch rảnh thực tế sau khi trừ đi các booking đang chiếm lịch.
     */
    @Query("SELECT pa FROM ProviderAvailability pa " +
           "WHERE pa.provider.accountId = :providerId " +
           "AND pa.state = :state " +
           "AND pa.startsAt < :to " +
           "AND pa.endsAt > :from " +
           "ORDER BY pa.startsAt ASC")
    List<ProviderAvailability> findSlotsInRangeByState(
            @Param("providerId") Long providerId,
            @Param("state") AvailabilityState state,
            @Param("from") Instant from,
            @Param("to") Instant to
    );

    default List<ProviderAvailability> findAvailableSlotsInRange(Long providerId, Instant from, Instant to) {
        return findSlotsInRangeByState(providerId, AvailabilityState.AVAILABLE, from, to);
    }
}
