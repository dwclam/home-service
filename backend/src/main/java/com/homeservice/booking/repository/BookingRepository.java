package com.homeservice.booking.repository;

import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.enums.BookingStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByCustomerIdAndClientRequestKey(Long customerId, UUID clientRequestKey);

    boolean existsByBookingCode(String bookingCode);

    @Query(value = "SELECT COUNT(*) > 0 FROM bookings b " +
                   "WHERE b.customer_id = :customerId " +
                   "AND b.status = 'COMPLETED' " +
                   "AND b.balance_due_at < :now " +
                   "AND NOT EXISTS (" +
                   "    SELECT 1 FROM payment_transactions p " +
                   "    WHERE p.booking_id = b.id " +
                   "    AND p.kind = 'BALANCE' " +
                   "    AND p.status = 'SUCCEEDED' " +
                   "    AND p.allocation_status = 'APPLIED'" +
                   ")", nativeQuery = true)
    boolean hasOverdueBalance(@Param("customerId") Long customerId, @Param("now") Instant now);

    @Query(value = "SELECT COUNT(*) > 0 FROM bookings b " +
                   "WHERE b.provider_id = :providerId " +
                   "AND (" +
                   "    b.status IN ('CONFIRMED', 'IN_PROGRESS') " +
                   "    OR (b.status = 'PENDING_DEPOSIT' AND b.deposit_due_at > :now)" +
                   ") " +
                   "AND b.starts_at < :endsAt AND b.ends_at > :startsAt", nativeQuery = true)
    boolean hasOverlappingExclusiveBooking(
            @Param("providerId") Long providerId,
            @Param("startsAt") Instant startsAt,
            @Param("endsAt") Instant endsAt,
            @Param("now") Instant now
    );

    @Query(value = "SELECT b.* FROM bookings b " +
                   "WHERE b.provider_id = :providerId " +
                   "AND (" +
                   "    b.status IN ('CONFIRMED', 'IN_PROGRESS') " +
                   "    OR (b.status = 'PENDING_DEPOSIT' AND b.deposit_due_at > :now)" +
                   ") " +
                   "AND b.starts_at < :endsAt AND b.ends_at > :startsAt " +
                   "LIMIT 1", nativeQuery = true)
    Optional<Booking> findFirstOverlappingExclusiveBooking(
            @Param("providerId") Long providerId,
            @Param("startsAt") Instant startsAt,
            @Param("endsAt") Instant endsAt,
            @Param("now") Instant now
    );

    @Query(value = "SELECT b.* FROM bookings b " +
                   "WHERE b.provider_id = :providerId " +
                   "AND b.id != :excludedBookingId " +
                   "AND (" +
                   "    b.status IN ('CONFIRMED', 'IN_PROGRESS') " +
                   "    OR (b.status = 'PENDING_DEPOSIT' AND b.deposit_due_at > :now)" +
                   ") " +
                   "AND b.starts_at < :endsAt AND b.ends_at > :startsAt " +
                   "LIMIT 1", nativeQuery = true)
    Optional<Booking> findFirstOverlappingExclusiveBookingExcluding(
            @Param("providerId") Long providerId,
            @Param("startsAt") Instant startsAt,
            @Param("endsAt") Instant endsAt,
            @Param("excludedBookingId") Long excludedBookingId,
            @Param("now") Instant now
    );

    @Query(value = "SELECT b.* FROM bookings b " +
                   "WHERE b.provider_id = :providerId " +
                   "AND (" +
                   "    b.status IN ('CONFIRMED', 'IN_PROGRESS') " +
                   "    OR (b.status = 'PENDING_DEPOSIT' AND b.deposit_due_at > :now)" +
                   ") " +
                   "AND b.starts_at < :slotEndsAt AND b.ends_at > :slotStartsAt " +
                   "AND NOT EXISTS (" +
                   "    SELECT 1 FROM provider_availability pa " +
                   "    WHERE pa.provider_id = :providerId " +
                   "    AND pa.id != :excludedSlotId " +
                   "    AND pa.state = 'AVAILABLE' " +
                   "    AND pa.starts_at <= b.starts_at " +
                   "    AND pa.ends_at >= b.ends_at" +
                   ") " +
                   "LIMIT 1", nativeQuery = true)
    Optional<Booking> findOrphanedBookingIfSlotRemoved(
            @Param("providerId") Long providerId,
            @Param("slotStartsAt") Instant slotStartsAt,
            @Param("slotEndsAt") Instant slotEndsAt,
            @Param("excludedSlotId") Long excludedSlotId,
            @Param("now") Instant now
    );

    @Query("SELECT b FROM Booking b WHERE b.provider.accountId = :providerId AND b.status = :status AND b.id != :excludedBookingId")
    Optional<Booking> findFirstByProviderIdAndStatusExcluding(
            @Param("providerId") Long providerId,
            @Param("status") BookingStatus status,
            @Param("excludedBookingId") Long excludedBookingId
    );

    /**
     * Tìm danh sách đơn PENDING_PROVIDER đã quá hạn phản hồi của NCC (requestExpiresAt <= now).
     */
    List<Booking> findByStatusAndRequestExpiresAtBefore(
            BookingStatus status,
            Instant now,
            Pageable pageable
    );

    /**
     * Tìm danh sách đơn PENDING_DEPOSIT đã quá hạn thanh toán tiền cọc (depositDueAt <= now).
     */
    List<Booking> findByStatusAndDepositDueAtBefore(
            BookingStatus status,
            Instant now,
            Pageable pageable
    );

    /**
     * Tìm các đơn PENDING_DEPOSIT đã quá hạn cọc của NCC đang chồng lấn với khung giờ [startsAt, endsAt]
     * để giải phóng lịch (nhả lịch) ngay lập tức khi xét duyệt đơn cạnh tranh.
     */
    @Query("SELECT b FROM Booking b WHERE b.provider.accountId = :providerId " +
           "AND b.status = 'PENDING_DEPOSIT' AND b.depositDueAt <= :now " +
           "AND b.startsAt < :endsAt AND b.endsAt > :startsAt")
    List<Booking> findOverduePendingDepositOverlapping(
            @Param("providerId") Long providerId,
            @Param("startsAt") Instant startsAt,
            @Param("endsAt") Instant endsAt,
            @Param("now") Instant now
    );
}
