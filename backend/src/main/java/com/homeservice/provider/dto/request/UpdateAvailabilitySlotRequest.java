package com.homeservice.provider.dto.request;

import com.homeservice.provider.enums.AvailabilityState;
import jakarta.validation.constraints.NotNull;
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
public class UpdateAvailabilitySlotRequest {

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    private Instant startsAt;

    @NotNull(message = "Thời gian kết thúc không được để trống")
    private Instant endsAt;

    @NotNull(message = "Trạng thái lịch không được để trống")
    private AvailabilityState state;
}
