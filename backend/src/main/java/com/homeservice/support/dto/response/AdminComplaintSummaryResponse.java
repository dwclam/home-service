package com.homeservice.support.dto.response;

import com.homeservice.booking.enums.BookingStatus;
import com.homeservice.booking.enums.SettlementStatus;
import com.homeservice.support.enums.ComplaintCategory;
import com.homeservice.support.enums.ComplaintStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * DTO tóm tắt khiếu nại trên bảng quản trị Admin (UC 33).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminComplaintSummaryResponse {

    private Long id;
    private ComplaintCategory category;
    private String subject;
    private ComplaintStatus status;
    private CustomerSummary customer;
    private BookingSummary booking;
    private AdminSummary assignedAdmin;
    private Long conversationId;
    private String lastMessagePreview;
    private Instant lastMessageAt;
    private Instant resolvedAt;
    private Instant createdAt;
    private Instant updatedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerSummary {
        private Long id;
        private String displayName;
        private String email;
        private String phone;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BookingSummary {
        private Long id;
        private String bookingCode;
        private BookingStatus status;
        private SettlementStatus settlementStatus;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminSummary {
        private Long id;
        private String displayName;
        private String email;
    }
}
