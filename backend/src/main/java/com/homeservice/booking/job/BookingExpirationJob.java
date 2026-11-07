package com.homeservice.booking.job;

import com.homeservice.booking.dto.response.BookingExpirationResult;
import com.homeservice.booking.policy.BookingExpirationProperties;
import com.homeservice.booking.service.BookingExpirationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Tác vụ nền định kỳ quét và tự động chuyển các đơn đặt lịch quá hạn sang EXPIRED (UC 51).
 * <p>
 * Xử lý:
 * 1. Đơn PENDING_PROVIDER quá hạn phản hồi của NCC (requestExpiresAt <= now).
 * 2. Đơn PENDING_DEPOSIT quá hạn thanh toán tiền cọc (depositDueAt <= now) -> Nhả lịch độc quyền.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BookingExpirationJob {

    private final BookingExpirationService expirationService;
    private final BookingExpirationProperties properties;

    @Scheduled(cron = "${app.booking.expiration.cron:0 * * * * *}")
    public void run() {
        if (properties != null && !properties.isEnabled()) {
            log.trace("Booking expiration job is disabled, skipping execution");
            return;
        }

        try {
            BookingExpirationResult result = expirationService.expireOverdueBookings();
            if (result.totalExpiredCount() > 0 || result.totalErrors() > 0) {
                log.info("Booking expiration job completed: {} total bookings expired (providerTimeout: {}, depositTimeout: {}), errors: {}",
                        result.totalExpiredCount(),
                        result.providerExpiredCount(),
                        result.depositExpiredCount(),
                        result.totalErrors());
            }
        } catch (Throwable ex) {
            log.error("Lỗi ngoài dự kiến khi thực thi BookingExpirationJob", ex);
        }
    }
}
