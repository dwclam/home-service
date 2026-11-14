package com.homeservice.service.dto;

import lombok.Getter;
import lombok.Setter;

// Dữ liệu một ảnh của dịch vụ
@Getter
@Setter
public class ServiceImageResponse {

    private Long id;
    private String imageUrl;
    private String altText;
    private Integer sortOrder;
}
