package com.homeservice.provider.mapper;

import com.homeservice.provider.dto.response.ProviderPublicResponse;
import com.homeservice.provider.entity.ProviderProfile;
import org.springframework.stereotype.Component;

@Component
public class ProviderPublicMapper {

    // Hồ sơ NCC -> dữ liệu công khai cho khách (chỉ 6 trường được phép)
    public ProviderPublicResponse toPublic(ProviderProfile p) {
        ProviderPublicResponse r = new ProviderPublicResponse();
        r.setProviderId(p.getAccountId());
        r.setBusinessName(p.getBusinessName());
        r.setBio(p.getBio());
        r.setCity(p.getCity());
        r.setAddress(p.getAddress());
        r.setLogoUrl(p.getLogoUrl());
        return r;
    }
}