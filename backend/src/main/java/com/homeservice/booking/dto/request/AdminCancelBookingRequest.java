package com.homeservice.booking.dto.request;

import com.homeservice.booking.enums.TerminationReason;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request cho hành động Admin can thiệp hủy đơn cưỡng chế (UC 31).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminCancelBookingRequest {

    @NotNull(message = "Mã lý do can thiệp không được để trống")
    private TerminationReason reasonCode;

    @NotBlank(message = "Lý do can thiệp không được để trống")
    @Size(min = 5, max = 500, message = "Lý do can thiệp phải từ 5 đến 500 ký tự")
    private String reason;

    private Long version;
}
