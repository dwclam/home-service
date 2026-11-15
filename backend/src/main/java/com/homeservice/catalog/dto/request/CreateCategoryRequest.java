package com.homeservice.catalog.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CreateCategoryRequest {

    @NotBlank(message = "Tên danh mục không được để trống")
    @Size(max = 100, message = "Tên tối đa 100 ký tự")
    private String name;

    @NotBlank(message = "Slug không được để trống")
    @Size(max = 120, message = "Slug tối đa 120 ký tự")
    @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$",
            message = "Slug chỉ gồm chữ thường, số và dấu gạch ngang")
    private String slug;

    private String description;

    @Size(max = 50, message = "Tên icon tối đa 50 ký tự")
    private String iconName;

    @PositiveOrZero(message = "Thứ tự không được âm")
    private Integer sortOrder;

    private Long parentId;
}