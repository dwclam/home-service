package com.homeservice.booking.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateBookingRequest {

    @NotNull(message = "clientRequestKey không được để trống")
    private UUID clientRequestKey;

    @NotNull(message = "providerId không được để trống")
    private Long providerId;

    @NotNull(message = "serviceId không được để trống")
    private Long serviceId;

    @NotNull(message = "startsAt không được để trống")
    @Future(message = "Thời gian bắt đầu phải ở tương lai")
    private Instant startsAt;

    private Long addressId;

    private String recipientName;
    private String recipientPhone;
    private String addressLine;
    private String ward;
    private String city;
    private String addressInstructions;

    private String customerNote;
}
