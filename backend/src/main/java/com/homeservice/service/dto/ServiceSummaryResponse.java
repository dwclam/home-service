package com.homeservice.service.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

// Dữ liệu tóm tắt một dịch vụ trong danh sách tìm kiếm của khách
@Getter
@Setter
public class ServiceSummaryResponse {

    private Long id;
    private String title;
    private Long basePriceVnd;
    private Integer durationMinutes;

    // Danh mục
    private Long categoryId;
    private String categoryName;

    // NCC cung cấp (chỉ thông tin công khai)
    private Long providerId;
    private String providerName;
    private String providerCity;

    private Instant createdAt;
}
