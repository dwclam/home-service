package com.homeservice.booking.controller;

import com.homeservice.booking.dto.response.BookingExpirationResult;
import com.homeservice.booking.service.BookingExpirationService;
import com.homeservice.common.dto.StandardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller dành cho Quản trị viên (Admin) thao tác trên đơn đặt lịch.
 */
@RestController
@RequestMapping({"/api/v1/admin/bookings", "/api/admin/bookings"})
@RequiredArgsConstructor
public class AdminBookingController {

    private final BookingExpirationService expirationService;

    /**
     * Kích hoạt thủ công tác vụ quét và hết hạn các đơn đặt lịch quá hạn (UC 51).
     * Yêu cầu quyền ROLE_ADMIN.
     */
    @PostMapping("/expire-overdue")
    public StandardResponse<BookingExpirationResult> triggerOverdueExpiration() {
        BookingExpirationResult result = expirationService.expireOverdueBookings();
        return StandardResponse.success("Đã hoàn tất quét và xử lý hết hạn các đơn đặt lịch quá hạn", result);
    }
}
