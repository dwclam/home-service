package com.homeservice.booking.dto.response;

import com.homeservice.booking.enums.BookingStatus;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingResponse {
    private Long id;
    private Long version;
    private String bookingCode;
    private String serviceTitle;
    private String providerName;
    private Instant startsAt;
    private Instant endsAt;
    private BookingStatus status;
    private Long totalAmountVnd;
    private Long depositAmountVnd;
    private Instant requestExpiresAt;
    private Instant createdAt;
}
