package com.homeservice.support.dto.response;

import com.homeservice.account.enums.AccountStatus;
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
import java.util.List;

/**
 * DTO chi tiết toàn diện 360° của một khiếu nại / yêu cầu hỗ trợ dành cho Admin (UC 33).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminComplaintDetailResponse {

    private Long id;
    private ComplaintCategory category;
    private String subject;
    private String description;
    private ComplaintStatus status;
    private String resolution;
    private Instant resolvedAt;
    private Instant createdAt;
    private Instant updatedAt;

    private CustomerProfileResponse customer;
    private AdminProfileResponse assignedAdmin;
    private BookingContextResponse booking;

    private Long conversationId;
    private Instant lastMessageAt;
    private boolean canCurrentAdminReply;

    private List<AdminAuditLogResponse> adminAuditLogs;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerProfileResponse {
        private Long id;
        private String displayName;
        private String email;
        private String phone;
        private AccountStatus status;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminProfileResponse {
        private Long id;
        private String displayName;
        private String email;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BookingContextResponse {
        private Long id;
        private String bookingCode;
        private String serviceTitleSnapshot;
        private BookingStatus status;
        private Long totalAmountVnd;
        private Long providerDueVnd;
        private SettlementStatus settlementStatus;
        private String settlementNote;
        private long unresolvedComplaintCount;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminAuditLogResponse {
        private Long id;
        private Long adminId;
        private String adminDisplayName;
        private String action;
        private String reason;
        private Object changes;
        private Instant createdAt;
    }
}
