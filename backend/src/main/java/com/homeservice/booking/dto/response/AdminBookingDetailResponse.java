package com.homeservice.booking.dto.response;

import com.homeservice.account.enums.AccountStatus;
import com.homeservice.booking.enums.BookingStatus;
import com.homeservice.booking.enums.SettlementStatus;
import com.homeservice.booking.enums.TerminationKind;
import com.homeservice.booking.enums.TerminationReason;
import com.homeservice.common.enums.ActorType;
import com.homeservice.payment.enums.PaymentAllocationStatus;
import com.homeservice.payment.enums.PaymentKind;
import com.homeservice.payment.enums.PaymentStatus;
import com.homeservice.payment.enums.RefundReason;
import com.homeservice.provider.enums.BankVerificationStatus;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DTO chi tiết toàn diện (360-degree view) đơn đặt lịch dành cho Admin (UC 31).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminBookingDetailResponse {

    // 1. Định danh & Phiên bản
    private Long id;
    private String bookingCode;
    private UUID clientRequestKey;
    private Long version;
    private Instant createdAt;
    private Instant updatedAt;

    // 2. Snapshot Hợp đồng & Dịch vụ
    private Long serviceId;
    private String serviceTitleSnapshot;
    private Integer durationMinutesSnapshot;
    private String customerNote;

    // 3. Khách hàng & Địa chỉ thi công
    private CustomerProfileResponse customer;
    private BookingAddressResponse address;

    // 4. Nhà cung cấp phụ trách
    private ProviderProfileResponse provider;

    // 5. Tiến độ & Mốc thời gian
    private Instant startsAt;
    private Instant endsAt;
    private BookingStatus status;
    private Instant requestExpiresAt;
    private Instant acceptedAt;
    private Instant depositDueAt;
    private Instant startedAt;
    private Instant completedAt;
    private Instant balanceDueAt;

    // 6. Tài chính & Tỷ lệ hợp đồng
    private Long totalAmountVnd;
    private Integer depositPercent;
    private Long depositAmountVnd;
    private Long balanceAmountVnd;
    private Integer platformFeePercent;

    private Integer cancelCutoffMinutes;
    private Integer earlyRefundPercent;
    private Integer lateRefundPercent;
    private Integer providerRefundPercent;
    private Integer systemRefundPercent;

    private Long grossCollectedVnd;
    private Long refundedVnd;
    private Long netRetainedVnd;
    private Long platformFeeVnd;
    private Long providerDueVnd;

    // 7. Thông tin Chấm dứt / Hủy đơn
    private BookingTerminationResponse termination;

    // 8. Trạng thái & Lịch sử Đối soát
    private BookingSettlementResponse settlement;

    // 9. Lịch sử biến chuyển trạng thái
    private List<BookingStatusHistoryResponse> statusHistory;

    // 10. Nhật ký Giao dịch thanh toán
    private List<PaymentTransactionSummaryResponse> paymentTransactions;

    // 11. Nhật ký Can thiệp Quản trị viên
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
    public static class BookingAddressResponse {
        private Long addressId;
        private String recipientName;
        private String recipientPhone;
        private String addressLine;
        private String ward;
        private String city;
        private String addressInstructions;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProviderProfileResponse {
        private Long id;
        private String businessName;
        private String displayName;
        private String email;
        private String phone;
        private String city;
        private String address;
        private BankVerificationStatus bankVerificationStatus;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BookingTerminationResponse {
        private TerminationKind terminationKind;
        private ActorType terminationActorType;
        private Long terminatedByAccountId;
        private String terminatedByDisplayName;
        private TerminationReason terminationReasonCode;
        private String terminationReason;
        private Instant terminatedAt;
        private Integer refundPercent;
        private Long estimatedRefundAmountVnd;
        private Long refundedAmountVnd;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BookingSettlementResponse {
        private SettlementStatus settlementStatus;
        private String settlementNote;
        private Instant settledAt;
        private Long settledByAdminId;
        private String settledByAdminName;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BookingStatusHistoryResponse {
        private Long id;
        private BookingStatus fromStatus;
        private BookingStatus toStatus;
        private ActorType actorType;
        private Long actorAccountId;
        private String actorDisplayName;
        private String reasonCode;
        private String note;
        private Instant createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentTransactionSummaryResponse {
        private Long id;
        private PaymentKind kind;
        private String processor;
        private String merchantReference;
        private String externalTransactionId;
        private Long expectedAmountVnd;
        private Long receivedAmountVnd;
        private Long processingFeeVnd;
        private PaymentStatus status;
        private PaymentAllocationStatus allocationStatus;
        private Long refundDueVnd;
        private RefundReason refundReason;
        private Instant gatewayPaidAt;
        private Instant succeededAt;
        private String failureReason;
        private Instant createdAt;
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
