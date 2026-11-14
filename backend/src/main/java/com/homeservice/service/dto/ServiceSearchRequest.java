package com.homeservice.service.dto;

import com.homeservice.service.enums.ServiceSort;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

// Tham số tìm kiếm dịch vụ, gửi qua query string
@Getter
@Setter
public class ServiceSearchRequest {

    // Từ khóa tìm trong tên và mô tả
    @Size(max = 100, message = "Từ khóa tối đa 100 ký tự")
    private String keyword;

    // Lọc theo danh mục (gồm cả danh mục con)
    private Long categoryId;
    // Chỉ lấy dịch vụ của một NCC (dùng cho trang hồ sơ NCC)
    private Long providerId;

    // Lọc theo khu vực của NCC
    @Size(max = 150, message = "Khu vực tối đa 150 ký tự")
    private String city;

    // Khoảng giá (VND), không bắt buộc
    @PositiveOrZero(message = "Giá thấp nhất không được âm")
    private Long minPrice;

    @PositiveOrZero(message = "Giá cao nhất không được âm")
    private Long maxPrice;

    // Kiểu sắp xếp, mặc định mới nhất
    private ServiceSort sort = ServiceSort.NEWEST;

    // Phân trang: trang đầu tiên là 0
    @Min(value = 0, message = "Trang phải từ 0")
    private int page = 0;

    @Min(value = 1, message = "Kích thước trang tối thiểu là 1")
    @Max(value = 50, message = "Kích thước trang tối đa là 50")
    private int size = 10;
}
