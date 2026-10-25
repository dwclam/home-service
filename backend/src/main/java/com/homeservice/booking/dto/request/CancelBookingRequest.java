package com.homeservice.booking.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CancelBookingRequest {

    @NotNull(message = "Version không được để trống")
    private Long version;

    @Size(max = 500, message = "Lý do hủy tối đa 500 ký tự")
    private String reason;
}
