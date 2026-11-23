package com.homeservice.provider.service;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

// Kiểm tra tài khoản NCC còn được phép dùng chức năng NCC
@Component
@RequiredArgsConstructor
public class ProviderAccountGuard {

    private final AccountRepository accountRepository;

    // Chặn NCC bị khóa, chưa kích hoạt hoặc chưa đổi mật khẩu lần đầu
    public void requireActive(Long providerId) {
        Account account = accountRepository.findById(providerId)
                .orElseThrow(() -> new AccessDeniedException("Không xác định được tài khoản nhà cung cấp"));

        if (account.getStatus() != AccountStatus.ACTIVE
                || Boolean.TRUE.equals(account.getMustChangePassword())) {
            throw new AccessDeniedException(
                    "Tài khoản nhà cung cấp chưa được kích hoạt, đã bị khóa hoặc cần đổi mật khẩu");
        }
    }
}