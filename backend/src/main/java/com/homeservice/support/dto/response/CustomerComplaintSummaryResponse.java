package com.homeservice.support.dto.response;

import com.homeservice.support.enums.ComplaintCategory;
import com.homeservice.support.enums.ComplaintStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * DTO tóm tắt yêu cầu hỗ trợ / khiếu nại trong danh sách của Khách hàng (UC 39).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerComplaintSummaryResponse {

    private Long id;
    private ComplaintCategory category;
    private String subject;
    private ComplaintStatus status;
    private Long bookingId;
    private String bookingCode;
    private String assignedAdminName;
    private Long conversationId;
    private String lastMessagePreview;
    private Instant lastMessageAt;
    private Instant createdAt;
    private Instant updatedAt;
}
