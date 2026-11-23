package com.homeservice.booking.dto.response;

import com.homeservice.booking.enums.BookingStatus;
import com.homeservice.booking.enums.SettlementStatus;
import lombok.*;

import java.time.Instant;

/**
 * DTO tóm tắt đơn đặt lịch hiển thị trên bảng quản trị Admin (UC 31).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminBookingSummaryResponse {

    private Long id;
    private String bookingCode;
    private CustomerSummary customer;
    private ProviderSummary provider;
    private ServiceSummary service;
    private Instant startsAt;
    private Instant endsAt;
    private BookingStatus status;
    private Long totalAmountVnd;
    private Long depositAmountVnd;
    private Long balanceAmountVnd;
    private SettlementStatus settlementStatus;
    private Long providerDueVnd;
    private Long version;
    private Instant createdAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerSummary {
        private Long id;
        private String displayName;
        private String phone;
        private String email;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProviderSummary {
        private Long id;
        private String businessName;
        private String phone;
        private String email;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ServiceSummary {
        private Long id;
        private String serviceTitleSnapshot;
        private Integer durationMinutesSnapshot;
    }
}
