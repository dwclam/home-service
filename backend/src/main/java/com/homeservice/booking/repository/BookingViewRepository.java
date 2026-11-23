package com.homeservice.booking.repository;

import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.Repository;

import java.util.Optional;

// Repository chỉ để ĐỌC đơn (UC10 cho khách, UC40 cho NCC)
public interface BookingViewRepository extends Repository<Booking, Long> {

    // ----- Khách hàng -----

    // Danh sách đơn của một khách; nạp sẵn NCC vì danh sách hiển thị tên NCC
    @EntityGraph(attributePaths = {"provider"})
    Page<Booking> findByCustomerId(Long customerId, Pageable pageable);

    // Như trên, lọc theo trạng thái
    @EntityGraph(attributePaths = {"provider"})
    Page<Booking> findByCustomerIdAndStatus(Long customerId, BookingStatus status, Pageable pageable);

    // Một đơn, chỉ khi đúng là của khách này (người khác sẽ không thấy)
    @EntityGraph(attributePaths = {"customer", "provider"})
    Optional<Booking> findByIdAndCustomerId(Long id, Long customerId);

    // ----- Nhà cung cấp -----

    // Danh sách đơn được giao cho một NCC
    Page<Booking> findByProviderAccountId(Long providerId, Pageable pageable);

    // Như trên, lọc theo trạng thái
    Page<Booking> findByProviderAccountIdAndStatus(Long providerId, BookingStatus status, Pageable pageable);

    // Một đơn, chỉ khi đúng là đơn được giao cho NCC này
    @EntityGraph(attributePaths = {"customer", "provider"})
    Optional<Booking> findByIdAndProviderAccountId(Long id, Long providerId);
}
