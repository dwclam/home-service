package com.homeservice.booking.repository;

import com.homeservice.booking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
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
}
