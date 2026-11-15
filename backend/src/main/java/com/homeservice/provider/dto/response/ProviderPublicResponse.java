package com.homeservice.provider.dto.response;

import lombok.Getter;
import lombok.Setter;

// Hồ sơ công khai của NCC mà khách được xem (UC07)
@Getter
@Setter
public class ProviderPublicResponse {

    private Long providerId;
    private String businessName;
    private String bio;
    private String city;
    private String address;
    private String logoUrl;
}
