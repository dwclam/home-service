package com.homeservice.provider.service;

import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.provider.dto.request.UpdateProviderProfileRequest;
import com.homeservice.provider.dto.response.ProviderProfileResponse;
import com.homeservice.provider.entity.ProviderProfile;
import com.homeservice.provider.mapper.ProviderProfileMapper;
import com.homeservice.provider.repository.ProviderProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProviderProfileService {

    private final ProviderProfileRepository repository;
    private final ProviderProfileMapper mapper;

    // Xem hồ sơ của chính NCC đang đăng nhập
    @Transactional(readOnly = true)
    public ProviderProfileResponse getMine(Long accountId) {
        return mapper.toResponse(find(accountId));
    }

    // Sửa hồ sơ của chính mình. CHỈ gán 5 trường công khai,
    // không đụng cột ngân hàng, isVisible, application của Lâm
    @Transactional
    public ProviderProfileResponse updateMine(Long accountId, UpdateProviderProfileRequest req) {
        ProviderProfile profile = find(accountId);
        profile.setBusinessName(req.getBusinessName());
        profile.setBio(req.getBio());
        profile.setCity(req.getCity());
        profile.setAddress(req.getAddress());
        profile.setLogoUrl(req.getLogoUrl());
        return mapper.toResponse(profile); // @Transactional tự lưu thay đổi
    }

    private ProviderProfile find(Long accountId) {
        return repository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ nhà cung cấp"));
    }
}