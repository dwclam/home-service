package com.homeservice.service.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

// Dữ liệu đầy đủ một dịch vụ khi khách xem chi tiết (UC06)
@Getter
@Setter
public class ServiceDetailResponse {

    private Long id;
    private String title;
    private String description;
    private Long basePriceVnd;
    private Integer durationMinutes;

    // Danh mục
    private Long categoryId;
    private String categoryName;

    // Ảnh dịch vụ, đã xếp theo thứ tự hiển thị
    private List<ServiceImageResponse> images = new ArrayList<>();

    // NCC cung cấp (chỉ thông tin công khai)
    private Long providerId;
    private String providerName;
    private String providerCity;
    private String providerBio;
    private String providerLogoUrl;
}
