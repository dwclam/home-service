package com.homeservice.support.mapper;

import com.homeservice.account.entity.Account;
import com.homeservice.audit.entity.AdminAuditLog;
import com.homeservice.booking.entity.Booking;
import com.homeservice.chat.entity.Conversation;
import com.homeservice.chat.entity.Message;
import com.homeservice.support.dto.response.AdminComplaintDetailResponse;
import com.homeservice.support.dto.response.AdminComplaintSummaryResponse;
import com.homeservice.support.dto.response.CustomerComplaintDetailResponse;
import com.homeservice.support.dto.response.CustomerComplaintSummaryResponse;
import com.homeservice.support.entity.Complaint;
import com.homeservice.support.enums.ComplaintStatus;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;

/**
 * Mapper chuyển đổi Entity Complaint & Conversation sang DTO (UC 39 & UC 33).
 */
@Component
public class ComplaintMapper {

    private static final int PREVIEW_MAX_LENGTH = 120;
    private static final ObjectMapper JSON_MAPPER = new ObjectMapper();

    public CustomerComplaintSummaryResponse toCustomerSummaryResponse(
            Complaint complaint,
            Conversation conversation,
            Message latestMessage
    ) {
        if (complaint == null) {
            return null;
        }

        Booking booking = complaint.getBooking();
        String assignedAdminName = complaint.getAssignedAdmin() != null
                ? complaint.getAssignedAdmin().getDisplayName()
                : null;

        String rawPreview = latestMessage != null ? latestMessage.getBody() : complaint.getDescription();
        String preview = truncatePreview(rawPreview);
        Instant lastMessageAt = latestMessage != null
                ? latestMessage.getCreatedAt()
                : (conversation != null ? conversation.getUpdatedAt() : complaint.getUpdatedAt());

        return CustomerComplaintSummaryResponse.builder()
                .id(complaint.getId())
                .category(complaint.getCategory())
                .subject(complaint.getSubject())
                .status(complaint.getStatus())
                .bookingId(booking != null ? booking.getId() : null)
                .bookingCode(booking != null ? booking.getBookingCode() : null)
                .assignedAdminName(assignedAdminName)
                .conversationId(conversation != null ? conversation.getId() : null)
                .lastMessagePreview(preview)
                .lastMessageAt(lastMessageAt)
                .createdAt(complaint.getCreatedAt())
                .updatedAt(complaint.getUpdatedAt())
                .build();
    }

    public CustomerComplaintDetailResponse toCustomerDetailResponse(Complaint complaint, Conversation conversation) {
        if (complaint == null) {
            return null;
        }

        CustomerComplaintDetailResponse.BookingSummary bookingSummary = null;
        Booking booking = complaint.getBooking();
        if (booking != null) {
            bookingSummary = CustomerComplaintDetailResponse.BookingSummary.builder()
                    .id(booking.getId())
                    .bookingCode(booking.getBookingCode())
                    .serviceTitleSnapshot(booking.getServiceTitleSnapshot())
                    .status(booking.getStatus())
                    .build();
        }

        String assignedAdminName = complaint.getAssignedAdmin() != null
                ? complaint.getAssignedAdmin().getDisplayName()
                : null;

        return CustomerComplaintDetailResponse.builder()
                .id(complaint.getId())
                .category(complaint.getCategory())
                .subject(complaint.getSubject())
                .description(complaint.getDescription())
                .status(complaint.getStatus())
                .resolution(complaint.getResolution())
                .resolvedAt(complaint.getResolvedAt())
                .booking(bookingSummary)
                .assignedAdminName(assignedAdminName)
                .conversationId(conversation != null ? conversation.getId() : null)
                .lastMessageAt(conversation != null ? conversation.getUpdatedAt() : null)
                .createdAt(complaint.getCreatedAt())
                .updatedAt(complaint.getUpdatedAt())
                .build();
    }

    public AdminComplaintSummaryResponse toAdminSummaryResponse(
            Complaint complaint,
            Conversation conversation,
            Message latestMessage
    ) {
        if (complaint == null) {
            return null;
        }

        Account customer = complaint.getCustomer();
        AdminComplaintSummaryResponse.CustomerSummary customerSummary = customer == null ? null :
                AdminComplaintSummaryResponse.CustomerSummary.builder()
                        .id(customer.getId())
                        .displayName(customer.getDisplayName())
                        .email(customer.getEmail())
                        .phone(customer.getPhone())
                        .build();

        Booking booking = complaint.getBooking();
        AdminComplaintSummaryResponse.BookingSummary bookingSummary = booking == null ? null :
                AdminComplaintSummaryResponse.BookingSummary.builder()
                        .id(booking.getId())
                        .bookingCode(booking.getBookingCode())
                        .status(booking.getStatus())
                        .settlementStatus(booking.getSettlementStatus())
                        .build();

        Account assignedAdmin = complaint.getAssignedAdmin();
        AdminComplaintSummaryResponse.AdminSummary adminSummary = assignedAdmin == null ? null :
                AdminComplaintSummaryResponse.AdminSummary.builder()
                        .id(assignedAdmin.getId())
                        .displayName(assignedAdmin.getDisplayName())
                        .email(assignedAdmin.getEmail())
                        .build();

        String rawPreview = latestMessage != null ? latestMessage.getBody() : complaint.getDescription();
        Instant lastMessageAt = latestMessage != null
                ? latestMessage.getCreatedAt()
                : (conversation != null ? conversation.getUpdatedAt() : complaint.getUpdatedAt());

        return AdminComplaintSummaryResponse.builder()
                .id(complaint.getId())
                .category(complaint.getCategory())
                .subject(complaint.getSubject())
                .status(complaint.getStatus())
                .customer(customerSummary)
                .booking(bookingSummary)
                .assignedAdmin(adminSummary)
                .conversationId(conversation != null ? conversation.getId() : null)
                .lastMessagePreview(truncatePreview(rawPreview))
                .lastMessageAt(lastMessageAt)
                .resolvedAt(complaint.getResolvedAt())
                .createdAt(complaint.getCreatedAt())
                .updatedAt(complaint.getUpdatedAt())
                .build();
    }

    public AdminComplaintDetailResponse toAdminDetailResponse(
            Complaint complaint,
            Conversation conversation,
            long unresolvedComplaintCountForBooking,
            List<AdminAuditLog> auditLogs,
            Long currentAdminId
    ) {
        if (complaint == null) {
            return null;
        }

        Account customer = complaint.getCustomer();
        AdminComplaintDetailResponse.CustomerProfileResponse customerProfile = customer == null ? null :
                AdminComplaintDetailResponse.CustomerProfileResponse.builder()
                        .id(customer.getId())
                        .displayName(customer.getDisplayName())
                        .email(customer.getEmail())
                        .phone(customer.getPhone())
                        .status(customer.getStatus())
                        .build();

        Account assignedAdmin = complaint.getAssignedAdmin();
        AdminComplaintDetailResponse.AdminProfileResponse assignedAdminProfile = assignedAdmin == null ? null :
                AdminComplaintDetailResponse.AdminProfileResponse.builder()
                        .id(assignedAdmin.getId())
                        .displayName(assignedAdmin.getDisplayName())
                        .email(assignedAdmin.getEmail())
                        .build();

        Booking booking = complaint.getBooking();
        AdminComplaintDetailResponse.BookingContextResponse bookingContext = booking == null ? null :
                AdminComplaintDetailResponse.BookingContextResponse.builder()
                        .id(booking.getId())
                        .bookingCode(booking.getBookingCode())
                        .serviceTitleSnapshot(booking.getServiceTitleSnapshot())
                        .status(booking.getStatus())
                        .totalAmountVnd(booking.getTotalAmountVnd())
                        .providerDueVnd(booking.getProviderDueVnd())
                        .settlementStatus(booking.getSettlementStatus())
                        .settlementNote(booking.getSettlementNote())
                        .unresolvedComplaintCount(unresolvedComplaintCountForBooking)
                        .build();

        boolean canCurrentAdminReply = complaint.getStatus() == ComplaintStatus.IN_REVIEW
                && assignedAdmin != null
                && currentAdminId != null
                && assignedAdmin.getId().equals(currentAdminId);

        List<AdminComplaintDetailResponse.AdminAuditLogResponse> auditResponses = auditLogs == null ? List.of() :
                auditLogs.stream().map(a -> AdminComplaintDetailResponse.AdminAuditLogResponse.builder()
                        .id(a.getId())
                        .adminId(a.getAdmin() != null ? a.getAdmin().getId() : null)
                        .adminDisplayName(a.getAdmin() != null ? a.getAdmin().getDisplayName() : null)
                        .action(a.getAction())
                        .reason(a.getReason())
                        .changes(parseChangesJson(a.getChanges()))
                        .createdAt(a.getCreatedAt())
                        .build()
                ).toList();

        return AdminComplaintDetailResponse.builder()
                .id(complaint.getId())
                .category(complaint.getCategory())
                .subject(complaint.getSubject())
                .description(complaint.getDescription())
                .status(complaint.getStatus())
                .resolution(complaint.getResolution())
                .resolvedAt(complaint.getResolvedAt())
                .createdAt(complaint.getCreatedAt())
                .updatedAt(complaint.getUpdatedAt())
                .customer(customerProfile)
                .assignedAdmin(assignedAdminProfile)
                .booking(bookingContext)
                .conversationId(conversation != null ? conversation.getId() : null)
                .lastMessageAt(conversation != null ? conversation.getUpdatedAt() : null)
                .canCurrentAdminReply(canCurrentAdminReply)
                .adminAuditLogs(auditResponses)
                .build();
    }

    private Object parseChangesJson(String rawChanges) {
        if (rawChanges == null || rawChanges.isBlank()) {
            return null;
        }
        try {
            return JSON_MAPPER.readTree(rawChanges);
        } catch (Exception ex) {
            return rawChanges;
        }
    }

    private String truncatePreview(String text) {
        if (text == null) {
            return null;
        }
        String normalized = text.trim();
        if (normalized.length() <= PREVIEW_MAX_LENGTH) {
            return normalized;
        }
        return normalized.substring(0, PREVIEW_MAX_LENGTH - 3) + "...";
    }
}
