package com.homeservice.booking.dto.response;

import com.homeservice.booking.enums.BookingStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

// Một dòng trong danh sách đơn được giao của NCC (UC40)
@Getter
@Setter
public class ProviderBookingListItemResponse {

    private Long id;

    // Gửi lại khi nhận, từ chối, bắt đầu, hoàn thành để chống ghi đè đồng thời
    private Long version;

    private String bookingCode;
    private String serviceTitle;

    // Người nhận dịch vụ và khu vực
    private String recipientName;
    private String city;

    private Instant startsAt;
    private Instant endsAt;
    private BookingStatus status;

    // Chỉ tổng giá trị đơn, NCC không xem chi tiết cọc và thanh toán ở đây
    private Long totalAmountVnd;

    // Hạn NCC phải phản hồi (có ý nghĩa khi đơn đang chờ NCC)
    private Instant requestExpiresAt;

    private Instant createdAt;
}