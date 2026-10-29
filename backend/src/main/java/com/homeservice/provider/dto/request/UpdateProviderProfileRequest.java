package com.homeservice.provider.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProviderProfileRequest(

        @NotBlank(message = "Tên cơ sở không được để trống")
        @Size(max = 150, message = "Tên cơ sở tối đa 150 ký tự")
        String businessName,

        String bio,

        @Size(max = 100, message = "Thành phố tối đa 100 ký tự")
        String city,

        @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
        String address,

        @Size(max = 500, message = "Đường dẫn logo tối đa 500 ký tự")
        String logoUrl
) {}