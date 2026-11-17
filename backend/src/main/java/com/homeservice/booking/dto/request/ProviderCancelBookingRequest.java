package com.homeservice.booking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderCancelBookingRequest {

    @NotBlank(message = "Lý do hủy đơn không được để trống")
    @Size(min = 5, max = 500, message = "Lý do hủy đơn phải từ 5 đến 500 ký tự")
    private String reason;

    private Long version;
}
