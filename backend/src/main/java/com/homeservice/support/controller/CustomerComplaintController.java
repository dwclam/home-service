package com.homeservice.support.controller;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.common.dto.StandardResponse;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.security.CurrentAccount;
import com.homeservice.support.dto.request.CreateComplaintRequest;
import com.homeservice.support.dto.response.CustomerComplaintDetailResponse;
import com.homeservice.support.service.ComplaintService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller dành cho Khách hàng gửi và theo dõi yêu cầu hỗ trợ / khiếu nại (UC 39).
 */
@RestController
@RequestMapping({"/api/v1/customer/complaints", "/api/customer/complaints"})
@RequiredArgsConstructor
public class CustomerComplaintController {

    private final ComplaintService complaintService;
    private final AccountRepository accountRepository;

    /**
     * Tạo yêu cầu hỗ trợ / khiếu nại mới (hỗ trợ chung hoặc gắn đơn đặt lịch của khách).
     * Yêu cầu quyền ROLE_CUSTOMER.
     */
    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.CREATED)
    public StandardResponse<CustomerComplaintDetailResponse> createComplaint(
            Authentication authentication,
            @Valid @RequestBody CreateComplaintRequest request
    ) {
        Long customerId = resolveCustomerId(authentication);
        CustomerComplaintDetailResponse response = complaintService.createComplaintByCustomer(customerId, request);
        return StandardResponse.success("Gửi yêu cầu hỗ trợ thành công", response);
    }

    private Long resolveCustomerId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Yêu cầu chưa được xác thực");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof CurrentAccount currentAccount) {
            if (currentAccount.getAccountType() != null
                    && !AccountType.CUSTOMER.name().equalsIgnoreCase(currentAccount.getAccountType())) {
                throw new AccessDeniedException("Tài khoản không có vai trò Khách hàng");
            }
            return currentAccount.getId();
        }
        String identifier = authentication.getName();
        if (identifier == null || identifier.isBlank() || "anonymousUser".equalsIgnoreCase(identifier)) {
            throw new AccessDeniedException("Không xác định được danh tính người dùng");
        }
        return accountRepository.findByEmail(identifier)
                .map(acc -> {
                    if (acc.getAccountType() != AccountType.CUSTOMER) {
                        throw new AccessDeniedException("Tài khoản không có vai trò Khách hàng");
                    }
                    return acc.getId();
                })
                .orElseGet(() -> {
                    try {
                        Long accountId = Long.parseLong(identifier);
                        Account acc = accountRepository.findById(accountId)
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản người dùng: " + identifier));
                        if (acc.getAccountType() != AccountType.CUSTOMER) {
                            throw new AccessDeniedException("Tài khoản không có vai trò Khách hàng");
                        }
                        return acc.getId();
                    } catch (NumberFormatException e) {
                        throw new ResourceNotFoundException("Không tìm thấy tài khoản người dùng: " + identifier);
                    }
                });
    }
}
