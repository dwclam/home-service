package com.homeservice.provider.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Chỉ 5 trường công khai được sửa. Không có ngân hàng, isVisible, application, id
@Getter
@Setter
@NoArgsConstructor // cần để Spring đổi JSON thành object
public class UpdateProviderProfileRequest {

    @NotBlank(message = "Tên cơ sở không được để trống")
    @Size(max = 200, message = "Tên cơ sở tối đa 200 ký tự")
    private String businessName;

    private String bio;

    // city bắt buộc vì cột city của entity là nullable = false
    @NotBlank(message = "Thành phố không được để trống")
    @Size(max = 150, message = "Thành phố tối đa 150 ký tự")
    private String city;

    private String address;

    private String logoUrl;
}