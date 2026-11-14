package com.homeservice.booking.controller;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.booking.dto.request.AdminBookingSearchFilter;
import com.homeservice.booking.dto.response.AdminBookingSummaryResponse;
import com.homeservice.booking.dto.response.BookingExpirationResult;
import com.homeservice.booking.service.AdminBookingService;
import com.homeservice.booking.service.BookingExpirationService;
import com.homeservice.common.dto.PageResponse;
import com.homeservice.common.dto.StandardResponse;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.security.CurrentAccount;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller dành cho Quản trị viên (Admin) thao tác trên đơn đặt lịch (UC 31 & UC 51).
 */
@RestController
@RequestMapping({"/api/v1/admin/bookings", "/api/admin/bookings"})
@RequiredArgsConstructor
public class AdminBookingController {

    private final BookingExpirationService expirationService;
    private final AdminBookingService adminBookingService;
    private final AccountRepository accountRepository;

    /**
     * Tra cứu danh sách đơn đặt lịch toàn hệ thống kèm lọc đa tiêu chí và phân trang (UC 31).
     * Yêu cầu quyền ROLE_ADMIN.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public StandardResponse<PageResponse<AdminBookingSummaryResponse>> getBookings(
            Authentication authentication,
            @Valid AdminBookingSearchFilter filter
    ) {
        resolveAdminId(authentication);
        PageResponse<AdminBookingSummaryResponse> response = adminBookingService.getBookings(filter);
        return StandardResponse.success("Lấy danh sách đơn đặt lịch thành công", response);
    }

    /**
     * Kích hoạt thủ công tác vụ quét và hết hạn các đơn đặt lịch quá hạn (UC 51).
     * Yêu cầu quyền ROLE_ADMIN.
     */
    @PostMapping("/expire-overdue")
    public StandardResponse<BookingExpirationResult> triggerOverdueExpiration() {
        BookingExpirationResult result = expirationService.expireOverdueBookings();
        return StandardResponse.success("Đã hoàn tất quét và xử lý hết hạn các đơn đặt lịch quá hạn", result);
    }

    /**
     * Xác thực và kiểm tra vai trò Quản trị viên (ADMIN) - Phòng thủ lớp 3.
     */
    private Long resolveAdminId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Yêu cầu chưa được xác thực");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof CurrentAccount currentAccount) {
            if (currentAccount.getAccountType() != null
                    && !AccountType.ADMIN.name().equalsIgnoreCase(currentAccount.getAccountType())) {
                throw new AccessDeniedException("Tài khoản không có quyền Quản trị viên");
            }
            return currentAccount.getId();
        }
        String identifier = authentication.getName();
        if (identifier == null || identifier.isBlank() || "anonymousUser".equalsIgnoreCase(identifier)) {
            throw new AccessDeniedException("Không xác định được danh tính người dùng");
        }
        return accountRepository.findByEmail(identifier)
                .map(acc -> {
                    if (acc.getAccountType() != AccountType.ADMIN) {
                        throw new AccessDeniedException("Tài khoản không có quyền Quản trị viên");
                    }
                    return acc.getId();
                })
                .orElseGet(() -> {
                    try {
                        Long accountId = Long.parseLong(identifier);
                        Account acc = accountRepository.findById(accountId)
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản quản trị viên: " + identifier));
                        if (acc.getAccountType() != AccountType.ADMIN) {
                            throw new AccessDeniedException("Tài khoản không có quyền Quản trị viên");
                        }
                        return acc.getId();
                    } catch (NumberFormatException e) {
                        throw new ResourceNotFoundException("Không tìm thấy tài khoản quản trị viên: " + identifier);
                    }
                });
    }
}
