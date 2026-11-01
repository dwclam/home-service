package com.homeservice.provider.dto.response;

import com.homeservice.provider.enums.AvailabilityState;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvailabilitySlotResponse {

    private Long id;
    private Long providerId;
    private Instant startsAt;
    private Instant endsAt;
    private AvailabilityState state;
    private Instant createdAt;
    private Instant updatedAt;
}
