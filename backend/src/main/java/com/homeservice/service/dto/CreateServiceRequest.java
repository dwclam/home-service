package com.homeservice.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateServiceRequest {

    // Danh mục bắt buộc phải chọn
    @NotNull(message = "Danh mục không được để trống")
    private Long categoryId;

    @NotBlank(message = "Tên dịch vụ không được để trống")
    @Size(max = 200, message = "Tên dịch vụ tối đa 200 ký tự")
    private String title;

    @NotBlank(message = "Mô tả không được để trống")
    private String description;

    // Giá VND (đồng), tối thiểu 2 để cọc 30% và phần còn lại đều lớn hơn 0
    @NotNull(message = "Giá không được để trống")
    @Min(value = 2, message = "Giá tối thiểu là 2 đồng")
    private Long basePriceVnd;

    // Thời lượng tính bằng phút, phải lớn hơn 0
    @NotNull(message = "Thời lượng không được để trống")
    @Positive(message = "Thời lượng phải lớn hơn 0")
    private Integer durationMinutes;
}
