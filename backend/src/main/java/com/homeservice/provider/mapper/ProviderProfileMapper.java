package com.homeservice.provider.mapper;

import com.homeservice.provider.dto.response.ProviderProfileResponse;
import com.homeservice.provider.entity.ProviderProfile;
import org.springframework.stereotype.Component;

@Component
public class ProviderProfileMapper {

    // Entity -> DTO, chỉ lấy trường công khai
    public ProviderProfileResponse toResponse(ProviderProfile p) {
        return new ProviderProfileResponse(
                p.getAccountId(),
                p.getBusinessName(),
                p.getBio(),
                p.getCity(),
                p.getAddress(),
                p.getLogoUrl(),
                Boolean.TRUE.equals(p.getIsVisible())); // entity của Lâm dùng Boolean isVisible
    }
}