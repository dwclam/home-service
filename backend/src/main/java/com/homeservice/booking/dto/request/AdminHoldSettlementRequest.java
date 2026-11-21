package com.homeservice.booking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request cho hành động Admin tạm giữ đối soát đơn đặt lịch (UC 31).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminHoldSettlementRequest {

    @NotBlank(message = "Lý do tạm giữ đối soát không được để trống")
    @Size(min = 5, max = 500, message = "Lý do tạm giữ đối soát phải từ 5 đến 500 ký tự")
    private String reason;

    private Long version;
}
