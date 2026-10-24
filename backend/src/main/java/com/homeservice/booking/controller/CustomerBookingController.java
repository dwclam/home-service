package com.homeservice.booking.controller;

import com.homeservice.account.entity.Account;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.booking.dto.request.CreateBookingRequest;
import com.homeservice.booking.dto.response.BookingDetailResponse;
import com.homeservice.booking.service.BookingService;
import com.homeservice.common.dto.StandardResponse;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.security.CurrentAccount;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/v1/customer/bookings", "/api/customer/bookings"})
@RequiredArgsConstructor
public class CustomerBookingController {

    private final BookingService bookingService;
    private final AccountRepository accountRepository;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StandardResponse<BookingDetailResponse> createBooking(
            Authentication authentication,
            @Valid @RequestBody CreateBookingRequest request
    ) {
        Long customerId = resolveCustomerId(authentication);
        BookingDetailResponse response = bookingService.createBooking(customerId, request);
        return StandardResponse.success("Đặt lịch thành công", response);
    }

    private Long resolveCustomerId(Authentication authentication) {
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
