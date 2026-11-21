package com.homeservice.support.mapper;

import com.homeservice.booking.entity.Booking;
import com.homeservice.chat.entity.Conversation;
import com.homeservice.support.dto.response.CustomerComplaintDetailResponse;
import com.homeservice.support.entity.Complaint;
import org.springframework.stereotype.Component;

/**
 * Mapper chuyển đổi Entity Complaint & Conversation sang DTO (UC 39 & UC 33).
 */
@Component
public class ComplaintMapper {

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
}
