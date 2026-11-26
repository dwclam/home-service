package com.homeservice.service.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

// Thứ tự mới của ảnh: danh sách id ảnh theo thứ tự hiển thị mong muốn
@Getter
@Setter
public class ReorderServiceImagesRequest {

    @NotEmpty(message = "Danh sách ảnh không được để trống")
    private List<@NotNull(message = "Id ảnh không được để trống") Long> imageIds;
}
