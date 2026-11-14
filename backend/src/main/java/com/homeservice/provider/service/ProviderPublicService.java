package com.homeservice.provider.service;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.provider.dto.response.ProviderPublicResponse;
import com.homeservice.provider.entity.ProviderProfile;
import com.homeservice.provider.mapper.ProviderPublicMapper;
import com.homeservice.provider.repository.ProviderProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProviderPublicService {

    private final ProviderProfileRepository providerProfileRepository;
    private final ProviderPublicMapper providerPublicMapper;

    // UC07: khách xem hồ sơ công khai của một NCC
    @Transactional(readOnly = true)
    public ProviderPublicResponse getPublicProfile(Long providerId) {
        // NCC không tồn tại hoặc không được phép xem đều trả cùng một lỗi 404
        ProviderProfile p = providerProfileRepository.findById(providerId)
                .filter(this::isPubliclyVisible)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhà cung cấp"));
        return providerPublicMapper.toPublic(p);
    }

    // Hồ sơ được xem công khai khi: NCC bật hiển thị, tài khoản hoạt động,
    // và đã đổi mật khẩu lần đầu
    private boolean isPubliclyVisible(ProviderProfile p) {
        Account account = p.getAccount();
        return Boolean.TRUE.equals(p.getIsVisible())
                && account.getStatus() == AccountStatus.ACTIVE
                && !Boolean.TRUE.equals(account.getMustChangePassword());
    }
}
