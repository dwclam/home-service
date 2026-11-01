package com.homeservice.provider.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchAvailabilityRequest {

    @NotEmpty(message = "Danh sách khung giờ không được để trống")
    @Valid
    private List<CreateAvailabilitySlotRequest> slots;
}
