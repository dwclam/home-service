package com.homeservice.provider.controller;

import com.homeservice.account.entity.Account;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.common.dto.StandardResponse;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.provider.dto.request.BatchAvailabilityRequest;
import com.homeservice.provider.dto.request.CreateAvailabilitySlotRequest;
import com.homeservice.provider.dto.request.UpdateAvailabilitySlotRequest;
import com.homeservice.provider.dto.response.AvailabilitySlotResponse;
import com.homeservice.provider.service.ProviderAvailabilityService;
import com.homeservice.security.CurrentAccount;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping({"/api/v1/provider/availability", "/api/provider/availability"})
@RequiredArgsConstructor
public class ProviderAvailabilityController {

    private final ProviderAvailabilityService availabilityService;
    private final AccountRepository accountRepository;

    @GetMapping
    public StandardResponse<List<AvailabilitySlotResponse>> getAvailabilitySlots(
            Authentication authentication,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to
    ) {
        Long providerId = resolveProviderId(authentication);
        List<AvailabilitySlotResponse> responses = availabilityService.getAvailabilitySlots(providerId, from, to);
        return StandardResponse.success("Lấy danh sách lịch rảnh thành công", responses);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StandardResponse<AvailabilitySlotResponse> createSlot(
            Authentication authentication,
            @Valid @RequestBody CreateAvailabilitySlotRequest request
    ) {
        Long providerId = resolveProviderId(authentication);
        AvailabilitySlotResponse response = availabilityService.createSlot(providerId, request);
        return StandardResponse.success("Tạo khoảng thời gian làm việc thành công", response);
    }

    @PostMapping("/batch")
    @ResponseStatus(HttpStatus.CREATED)
    public StandardResponse<List<AvailabilitySlotResponse>> createBatchSlots(
            Authentication authentication,
            @Valid @RequestBody BatchAvailabilityRequest request
    ) {
        Long providerId = resolveProviderId(authentication);
        List<AvailabilitySlotResponse> responses = availabilityService.createBatchSlots(providerId, request);
        return StandardResponse.success("Mở lịch hàng loạt thành công", responses);
    }

    @PutMapping("/{id}")
    public StandardResponse<AvailabilitySlotResponse> updateSlot(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody UpdateAvailabilitySlotRequest request
    ) {
        Long providerId = resolveProviderId(authentication);
        AvailabilitySlotResponse response = availabilityService.updateSlot(providerId, id, request);
        return StandardResponse.success("Cập nhật khoảng thời gian làm việc thành công", response);
    }

    @DeleteMapping("/{id}")
    public StandardResponse<Void> deleteSlot(
            Authentication authentication,
            @PathVariable Long id
    ) {
        Long providerId = resolveProviderId(authentication);
        availabilityService.deleteSlot(providerId, id);
        return StandardResponse.success("Xóa khoảng lịch thành công", null);
    }

    private Long resolveProviderId(Authentication authentication) {
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
