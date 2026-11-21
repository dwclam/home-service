package com.homeservice.support.dto.response;

import com.homeservice.booking.enums.BookingStatus;
import com.homeservice.support.enums.ComplaintCategory;
import com.homeservice.support.enums.ComplaintStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * DTO chi tiết yêu cầu hỗ trợ / khiếu nại dành cho Khách hàng (UC 39).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerComplaintDetailResponse {

    private Long id;
    private ComplaintCategory category;
    private String subject;
    private String description;
    private ComplaintStatus status;
    private String resolution;
    private Instant resolvedAt;
    private BookingSummary booking;
    private String assignedAdminName;
    private Long conversationId;
    private Instant lastMessageAt;
    private Instant createdAt;
    private Instant updatedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BookingSummary {
        private Long id;
        private String bookingCode;
        private String serviceTitleSnapshot;
        private BookingStatus status;
    }
}
