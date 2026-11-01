package com.homeservice.booking.controller;

import com.homeservice.account.entity.Account;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.booking.dto.request.AcceptBookingRequest;
import com.homeservice.booking.dto.request.RejectBookingRequest;
import com.homeservice.booking.dto.response.BookingDetailResponse;
import com.homeservice.booking.service.BookingService;
import com.homeservice.common.dto.StandardResponse;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.security.CurrentAccount;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/v1/provider/bookings", "/api/provider/bookings"})
@RequiredArgsConstructor
public class ProviderBookingController {

    private final BookingService bookingService;
    private final AccountRepository accountRepository;

    @PostMapping("/{bookingId}/accept")
    public StandardResponse<BookingDetailResponse> acceptBooking(
            Authentication authentication,
            @PathVariable Long bookingId,
            @Valid @RequestBody(required = false) AcceptBookingRequest request
    ) {
        Long providerAccountId = resolveProviderAccountId(authentication);
        BookingDetailResponse response = bookingService.acceptBookingByProvider(
                providerAccountId, bookingId, request != null ? request : new AcceptBookingRequest()
        );
        return StandardResponse.success("Nhà cung cấp đã chấp nhận đơn đặt lịch thành công", response);
    }

    @PostMapping("/{bookingId}/reject")
    public StandardResponse<BookingDetailResponse> rejectBooking(
            Authentication authentication,
            @PathVariable Long bookingId,
            @Valid @RequestBody RejectBookingRequest request
    ) {
        Long providerAccountId = resolveProviderAccountId(authentication);
        BookingDetailResponse response = bookingService.rejectBookingByProvider(
                providerAccountId, bookingId, request
        );
        return StandardResponse.success("Nhà cung cấp đã từ chối đơn đặt lịch thành công", response);
    }

    private Long resolveProviderAccountId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Yêu cầu chưa được xác thực");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof CurrentAccount currentAccount) {
            return currentAccount.getId();
        }
        String identifier = authentication.getName();
        if (identifier == null || identifier.isBlank() || "anonymousUser".equalsIgnoreCase(identifier)) {
            throw new AccessDeniedException("Không xác định được danh tính người dùng");
        }
        return accountRepository.findByEmail(identifier)
                .map(Account::getId)
                .orElseGet(() -> {
                    try {
                        return Long.parseLong(identifier);
                    } catch (NumberFormatException e) {
                        throw new ResourceNotFoundException("Không tìm thấy tài khoản người dùng: " + identifier);
                    }
                });
    }
}
