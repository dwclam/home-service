package com.homeservice.booking.mapper;

import com.homeservice.booking.dto.response.BookingDetailResponse;
import com.homeservice.booking.dto.response.BookingResponse;
import com.homeservice.booking.entity.Booking;
import org.springframework.stereotype.Component;

@Component
public class BookingMapper {

    public BookingDetailResponse toDetailResponse(Booking booking) {
        if (booking == null) {
            return null;
        }

        Long estimatedRefund = null;
        if (booking.getRefundPercent() != null && booking.getDepositAmountVnd() != null) {
            estimatedRefund = Math.round(booking.getDepositAmountVnd() * booking.getRefundPercent() / 100.0);
        }

        return BookingDetailResponse.builder()
                .id(booking.getId())
                .version(booking.getVersion())
                .bookingCode(booking.getBookingCode())
                .clientRequestKey(booking.getClientRequestKey())
                .customerId(booking.getCustomer() != null ? booking.getCustomer().getId() : null)
                .customerName(booking.getCustomer() != null ? booking.getCustomer().getDisplayName() : null)
                .providerId(booking.getProvider() != null ? booking.getProvider().getAccountId() : null)
                .providerName(booking.getProvider() != null ? booking.getProvider().getBusinessName() : null)
                .serviceId(booking.getService() != null ? booking.getService().getId() : null)
                .serviceTitle(booking.getServiceTitleSnapshot())
                .durationMinutes(booking.getDurationMinutesSnapshot())
                .startsAt(booking.getStartsAt())
                .endsAt(booking.getEndsAt())
                .status(booking.getStatus())
                .requestExpiresAt(booking.getRequestExpiresAt())
                .acceptedAt(booking.getAcceptedAt())
                .depositDueAt(booking.getDepositDueAt())
                .startedAt(booking.getStartedAt())
                .completedAt(booking.getCompletedAt())
                .balanceDueAt(booking.getBalanceDueAt())
                .totalAmountVnd(booking.getTotalAmountVnd())
                .depositPercent(booking.getDepositPercent())
                .depositAmountVnd(booking.getDepositAmountVnd())
                .balanceAmountVnd(booking.getBalanceAmountVnd())
                .platformFeePercent(booking.getPlatformFeePercent())
                .cancelCutoffMinutes(booking.getCancelCutoffMinutes())
                .earlyRefundPercent(booking.getEarlyRefundPercent())
                .lateRefundPercent(booking.getLateRefundPercent())
                .providerRefundPercent(booking.getProviderRefundPercent())
                .systemRefundPercent(booking.getSystemRefundPercent())
                .settlementStatus(booking.getSettlementStatus())
                .addressId(booking.getAddress() != null ? booking.getAddress().getId() : null)
                .recipientName(booking.getRecipientName())
                .recipientPhone(booking.getRecipientPhone())
                .addressLine(booking.getAddressLine())
                .ward(booking.getWard())
                .city(booking.getCity())
                .addressInstructions(booking.getAddressInstructions())
                .customerNote(booking.getCustomerNote())
                .createdAt(booking.getCreatedAt())
                .terminationKind(booking.getTerminationKind())
                .terminationActorType(booking.getTerminationActorType())
                .terminatedByAccountId(booking.getTerminatedByAccount() != null ? booking.getTerminatedByAccount().getId() : null)
                .terminationReasonCode(booking.getTerminationReasonCode())
                .terminationReason(booking.getTerminationReason())
                .terminatedAt(booking.getTerminatedAt())
                .refundPercent(booking.getRefundPercent())
                .estimatedRefundAmountVnd(estimatedRefund)
                .build();
    }

    public BookingResponse toSummaryResponse(Booking booking) {
        if (booking == null) {
            return null;
        }

        return BookingResponse.builder()
                .id(booking.getId())
                .version(booking.getVersion())
                .bookingCode(booking.getBookingCode())
                .serviceTitle(booking.getServiceTitleSnapshot())
                .providerName(booking.getProvider() != null ? booking.getProvider().getBusinessName() : null)
                .startsAt(booking.getStartsAt())
                .endsAt(booking.getEndsAt())
                .status(booking.getStatus())
                .totalAmountVnd(booking.getTotalAmountVnd())
                .depositAmountVnd(booking.getDepositAmountVnd())
                .requestExpiresAt(booking.getRequestExpiresAt())
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
