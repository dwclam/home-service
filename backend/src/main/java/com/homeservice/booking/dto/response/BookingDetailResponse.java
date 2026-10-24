package com.homeservice.booking.dto.response;

import com.homeservice.booking.enums.BookingStatus;
import com.homeservice.booking.enums.SettlementStatus;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingDetailResponse {

    private Long id;
    private Long version;
    private String bookingCode;
    private UUID clientRequestKey;

    private Long customerId;
    private String customerName;

    private Long providerId;
    private String providerName;

    private Long serviceId;
    private String serviceTitle;
    private Integer durationMinutes;

    private Instant startsAt;
    private Instant endsAt;
    private BookingStatus status;

    private Instant requestExpiresAt;
    private Instant acceptedAt;
    private Instant depositDueAt;
    private Instant startedAt;
    private Instant completedAt;
    private Instant balanceDueAt;

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

    private SettlementStatus settlementStatus;

    private Long addressId;
    private String recipientName;
    private String recipientPhone;
    private String addressLine;
    private String ward;
    private String city;
    private String addressInstructions;

    private String customerNote;
    private Instant createdAt;
}
