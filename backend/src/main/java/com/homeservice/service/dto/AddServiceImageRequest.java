package com.homeservice.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

// Dữ liệu NCC gửi khi thêm một ảnh cho dịch vụ (UC19)
@Getter
@Setter
public class AddServiceImageRequest {

    // Đường dẫn ảnh (không upload tệp), phải là http hoặc https
    @NotBlank(message = "Đường dẫn ảnh không được để trống")
    @Size(max = 2000, message = "Đường dẫn ảnh tối đa 2000 ký tự")
    @Pattern(regexp = "^https?://\\S+$", message = "Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://")
    private String imageUrl;

    // Mô tả ảnh, không bắt buộc
    @Size(max = 250, message = "Mô tả ảnh tối đa 250 ký tự")
    private String altText;
}