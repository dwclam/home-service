package com.homeservice.booking.mapper;

import com.homeservice.audit.entity.AdminAuditLog;
import com.homeservice.booking.dto.response.AdminBookingDetailResponse;
import com.homeservice.booking.dto.response.AdminBookingSummaryResponse;
import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.entity.BookingStatusHistory;
import com.homeservice.booking.enums.BookingStatus;
import com.homeservice.booking.enums.TerminationReason;
import com.homeservice.payment.entity.PaymentTransaction;
import com.homeservice.payment.enums.PaymentKind;
import com.homeservice.payment.enums.PaymentStatus;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Mapper chuyển đổi Entity Booking sang DTO phục vụ Admin (UC 31).
 */
@Component
public class AdminBookingMapper {

    public AdminBookingSummaryResponse toSummaryResponse(Booking booking) {
        if (booking == null) {
            return null;
        }

        AdminBookingSummaryResponse.CustomerSummary customerSummary = null;
        if (booking.getCustomer() != null) {
            customerSummary = AdminBookingSummaryResponse.CustomerSummary.builder()
                    .id(booking.getCustomer().getId())
                    .displayName(booking.getCustomer().getDisplayName())
                    .phone(booking.getCustomer().getPhone())
                    .email(booking.getCustomer().getEmail())
                    .build();
        }

        AdminBookingSummaryResponse.ProviderSummary providerSummary = null;
        if (booking.getProvider() != null) {
            String phone = null;
            String email = null;
            if (booking.getProvider().getAccount() != null) {
                phone = booking.getProvider().getAccount().getPhone();
                email = booking.getProvider().getAccount().getEmail();
            }
            providerSummary = AdminBookingSummaryResponse.ProviderSummary.builder()
                    .id(booking.getProvider().getAccountId())
                    .businessName(booking.getProvider().getBusinessName())
                    .phone(phone)
                    .email(email)
                    .build();
        }

        AdminBookingSummaryResponse.ServiceSummary serviceSummary = AdminBookingSummaryResponse.ServiceSummary.builder()
                .id(booking.getService() != null ? booking.getService().getId() : null)
                .serviceTitleSnapshot(booking.getServiceTitleSnapshot())
                .durationMinutesSnapshot(booking.getDurationMinutesSnapshot())
                .build();

        return AdminBookingSummaryResponse.builder()
                .id(booking.getId())
                .bookingCode(booking.getBookingCode())
                .customer(customerSummary)
                .provider(providerSummary)
                .service(serviceSummary)
                .startsAt(booking.getStartsAt())
                .endsAt(booking.getEndsAt())
                .status(booking.getStatus())
                .totalAmountVnd(booking.getTotalAmountVnd())
                .depositAmountVnd(booking.getDepositAmountVnd())
                .balanceAmountVnd(booking.getBalanceAmountVnd())
                .settlementStatus(booking.getSettlementStatus())
                .providerDueVnd(booking.getProviderDueVnd())
                .version(booking.getVersion())
                .createdAt(booking.getCreatedAt())
                .build();
    }

    public AdminBookingDetailResponse toDetailResponse(
            Booking booking,
            List<BookingStatusHistory> statusHistories,
            List<PaymentTransaction> paymentTransactions,
            List<AdminAuditLog> adminAuditLogs
    ) {
        if (booking == null) {
            return null;
        }

        // 1. Customer profile
        AdminBookingDetailResponse.CustomerProfileResponse customerProfile = null;
        if (booking.getCustomer() != null) {
            customerProfile = AdminBookingDetailResponse.CustomerProfileResponse.builder()
                    .id(booking.getCustomer().getId())
                    .displayName(booking.getCustomer().getDisplayName())
                    .email(booking.getCustomer().getEmail())
                    .phone(booking.getCustomer().getPhone())
                    .status(booking.getCustomer().getStatus())
                    .build();
        }

        // 2. Address
        AdminBookingDetailResponse.BookingAddressResponse addressResponse = null;
        if (booking.getAddressLine() != null || booking.getAddress() != null) {
            Long addressId = booking.getAddress() != null ? booking.getAddress().getId() : null;
            addressResponse = AdminBookingDetailResponse.BookingAddressResponse.builder()
                    .addressId(addressId)
                    .recipientName(booking.getRecipientName())
                    .recipientPhone(booking.getRecipientPhone())
                    .addressLine(booking.getAddressLine())
                    .ward(booking.getWard())
                    .city(booking.getCity())
                    .addressInstructions(booking.getAddressInstructions())
                    .build();
        }

        // 3. Provider profile
        AdminBookingDetailResponse.ProviderProfileResponse providerProfile = null;
        if (booking.getProvider() != null) {
            String displayName = null;
            String email = null;
            String phone = null;
            if (booking.getProvider().getAccount() != null) {
                displayName = booking.getProvider().getAccount().getDisplayName();
                email = booking.getProvider().getAccount().getEmail();
                phone = booking.getProvider().getAccount().getPhone();
            }
            providerProfile = AdminBookingDetailResponse.ProviderProfileResponse.builder()
                    .id(booking.getProvider().getAccountId())
                    .businessName(booking.getProvider().getBusinessName())
                    .displayName(displayName)
                    .email(email)
                    .phone(phone)
                    .city(booking.getProvider().getCity())
                    .address(booking.getProvider().getAddress())
                    .bankVerificationStatus(booking.getProvider().getBankVerificationStatus())
                    .build();
        }

        // 4. Termination
        AdminBookingDetailResponse.BookingTerminationResponse terminationResponse = null;
        if (booking.getTerminationKind() != null || booking.getTerminatedAt() != null) {
            Long terminatedById = booking.getTerminatedByAccount() != null ? booking.getTerminatedByAccount().getId() : null;
            String terminatedByName = booking.getTerminatedByAccount() != null ? booking.getTerminatedByAccount().getDisplayName() : null;

            // Xác định xem đơn đã từng nộp cọc thành công hay chưa
            boolean hasPaidDeposit = false;
            Long recordedRefundDue = null;

            if (paymentTransactions != null) {
                for (PaymentTransaction tx : paymentTransactions) {
                    if (tx.getKind() == PaymentKind.DEPOSIT && tx.getStatus() == PaymentStatus.SUCCEEDED) {
                        hasPaidDeposit = true;
                        if (tx.getRefundDueVnd() != null) {
                            recordedRefundDue = tx.getRefundDueVnd();
                        }
                        break;
                    }
                }
            }

            if (!hasPaidDeposit && booking.getGrossCollectedVnd() != null && booking.getGrossCollectedVnd() > 0) {
                hasPaidDeposit = true;
            }

            if (!hasPaidDeposit && statusHistories != null) {
                hasPaidDeposit = statusHistories.stream()
                        .anyMatch(h -> h.getToStatus() == BookingStatus.CONFIRMED || h.getFromStatus() == BookingStatus.CONFIRMED);
            }

            // Các lý do kết thúc trước khi cọc thì chắc chắn không có tiền cọc thực thu
            if (booking.getTerminationReasonCode() == TerminationReason.PROVIDER_RESPONSE_TIMEOUT
                    || booking.getTerminationReasonCode() == TerminationReason.DEPOSIT_TIMEOUT
                    || booking.getTerminationReasonCode() == TerminationReason.PROVIDER_REJECT
                    || booking.getStatus() == BookingStatus.EXPIRED
                    || booking.getStatus() == BookingStatus.REJECTED) {
                hasPaidDeposit = false;
            }

            Long estimatedRefund = 0L;
            if (hasPaidDeposit) {
                if (recordedRefundDue != null) {
                    estimatedRefund = recordedRefundDue;
                } else if (booking.getRefundPercent() != null && booking.getDepositAmountVnd() != null) {
                    estimatedRefund = Math.round(booking.getDepositAmountVnd() * booking.getRefundPercent() / 100.0);
                }
            } else {
                estimatedRefund = 0L;
            }

            Long refundedAmount = booking.getRefundedVnd() != null ? booking.getRefundedVnd() : 0L;

            terminationResponse = AdminBookingDetailResponse.BookingTerminationResponse.builder()
                    .terminationKind(booking.getTerminationKind())
                    .terminationActorType(booking.getTerminationActorType())
                    .terminatedByAccountId(terminatedById)
                    .terminatedByDisplayName(terminatedByName)
                    .terminationReasonCode(booking.getTerminationReasonCode())
                    .terminationReason(booking.getTerminationReason())
                    .terminatedAt(booking.getTerminatedAt())
                    .refundPercent(booking.getRefundPercent())
                    .estimatedRefundAmountVnd(estimatedRefund)
                    .refundedAmountVnd(refundedAmount)
                    .build();
        }

        // 5. Settlement
        Long settledById = booking.getSettledByAdmin() != null ? booking.getSettledByAdmin().getId() : null;
        String settledByName = booking.getSettledByAdmin() != null ? booking.getSettledByAdmin().getDisplayName() : null;
        AdminBookingDetailResponse.BookingSettlementResponse settlementResponse = AdminBookingDetailResponse.BookingSettlementResponse.builder()
                .settlementStatus(booking.getSettlementStatus())
                .settlementNote(booking.getSettlementNote())
                .settledAt(booking.getSettledAt())
                .settledByAdminId(settledById)
                .settledByAdminName(settledByName)
                .build();

        // 6. Status history timeline
        List<AdminBookingDetailResponse.BookingStatusHistoryResponse> historyResponses = statusHistories == null ? List.of() :
                statusHistories.stream().map(h -> {
                    Long actorId = h.getActorAccount() != null ? h.getActorAccount().getId() : null;
                    String actorName = h.getActorAccount() != null ? h.getActorAccount().getDisplayName() : null;
                    return AdminBookingDetailResponse.BookingStatusHistoryResponse.builder()
                            .id(h.getId())
                            .fromStatus(h.getFromStatus())
                            .toStatus(h.getToStatus())
                            .actorType(h.getActorType())
                            .actorAccountId(actorId)
                            .actorDisplayName(actorName)
                            .reasonCode(h.getReasonCode())
                            .note(h.getNote())
                            .createdAt(h.getCreatedAt())
                            .build();
                }).toList();

        // 7. Payment transactions
        List<AdminBookingDetailResponse.PaymentTransactionSummaryResponse> txnResponses = paymentTransactions == null ? List.of() :
                paymentTransactions.stream().map(t -> AdminBookingDetailResponse.PaymentTransactionSummaryResponse.builder()
                        .id(t.getId())
                        .kind(t.getKind())
                        .processor(t.getProcessor())
                        .merchantReference(t.getMerchantReference())
                        .externalTransactionId(t.getExternalTransactionId())
                        .expectedAmountVnd(t.getExpectedAmountVnd())
                        .receivedAmountVnd(t.getReceivedAmountVnd())
                        .processingFeeVnd(t.getProcessingFeeVnd())
                        .status(t.getStatus())
                        .allocationStatus(t.getAllocationStatus())
                        .refundDueVnd(t.getRefundDueVnd())
                        .refundReason(t.getRefundReason())
                        .gatewayPaidAt(t.getGatewayPaidAt())
                        .succeededAt(t.getSucceededAt())
                        .failureReason(t.getFailureReason())
                        .createdAt(t.getCreatedAt())
                        .build()
                ).toList();

        // 8. Admin audit logs
        List<AdminBookingDetailResponse.AdminAuditLogResponse> auditResponses = adminAuditLogs == null ? List.of() :
                adminAuditLogs.stream().map(a -> {
                    Long adminId = a.getAdmin() != null ? a.getAdmin().getId() : null;
                    String adminName = a.getAdmin() != null ? a.getAdmin().getDisplayName() : null;
                    return AdminBookingDetailResponse.AdminAuditLogResponse.builder()
                            .id(a.getId())
                            .adminId(adminId)
                            .adminDisplayName(adminName)
                            .action(a.getAction())
                            .reason(a.getReason())
                            .changes(a.getChanges())
                            .createdAt(a.getCreatedAt())
                            .build();
                }).toList();

        return AdminBookingDetailResponse.builder()
                .id(booking.getId())
                .bookingCode(booking.getBookingCode())
                .clientRequestKey(booking.getClientRequestKey())
                .version(booking.getVersion())
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .serviceId(booking.getService() != null ? booking.getService().getId() : null)
                .serviceTitleSnapshot(booking.getServiceTitleSnapshot())
                .durationMinutesSnapshot(booking.getDurationMinutesSnapshot())
                .customerNote(booking.getCustomerNote())
                .customer(customerProfile)
                .address(addressResponse)
                .provider(providerProfile)
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
                .grossCollectedVnd(booking.getGrossCollectedVnd())
                .refundedVnd(booking.getRefundedVnd())
                .netRetainedVnd(booking.getNetRetainedVnd())
                .platformFeeVnd(booking.getPlatformFeeVnd())
                .providerDueVnd(booking.getProviderDueVnd())
                .termination(terminationResponse)
                .settlement(settlementResponse)
                .statusHistory(historyResponses)
                .paymentTransactions(txnResponses)
                .adminAuditLogs(auditResponses)
                .build();
    }
}
