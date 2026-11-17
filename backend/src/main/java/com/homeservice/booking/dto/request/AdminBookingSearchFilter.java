package com.homeservice.booking.dto.request;

import com.homeservice.booking.enums.BookingStatus;
import com.homeservice.booking.enums.DateFilterType;
import com.homeservice.booking.enums.SettlementStatus;
import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.Instant;

/**
 * Tiêu chí tìm kiếm và phân trang đơn đặt lịch dành cho Admin (UC 31).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminBookingSearchFilter {

    private BookingStatus status;
    private SettlementStatus settlementStatus;
    private Long customerId;
    private Long providerId;
    private Long serviceId;
    private String bookingCode;

    @Builder.Default
    private DateFilterType dateFilterType = DateFilterType.CREATED_AT;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private Instant from;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private Instant to;

    @Builder.Default
    private Integer page = 0;

    @Builder.Default
    private Integer size = 20;

    @Builder.Default
    private String sortBy = "createdAt";

    @Builder.Default
    private String sortDir = "DESC";
}
