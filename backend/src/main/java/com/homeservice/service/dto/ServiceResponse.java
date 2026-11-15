package com.homeservice.service.dto;

import com.homeservice.catalog.enums.ServiceStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public class ServiceResponse {

    private Long id;
    private Long providerId;

    // Trả cả id và tên danh mục để frontend không phải gọi thêm
    private Long categoryId;
    private String categoryName;

    private String title;
    private String description;
    private Long basePriceVnd;
    private Integer durationMinutes;
    private ServiceStatus status;
    private Instant createdAt;
    private Instant updatedAt;
}
