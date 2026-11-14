package com.homeservice.booking.dto.request;

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
public class CompleteServiceRequest {

    private Long version;

    @Size(max = 500, message = "Ghi chú hoàn thành dịch vụ tối đa 500 ký tự")
    private String note;
}
