package com.homeservice.provider.controller;

import com.homeservice.provider.dto.request.UpdateProviderProfileRequest;
import com.homeservice.provider.dto.response.ProviderProfileResponse;
import com.homeservice.provider.service.ProviderProfileService;
import com.homeservice.security.CurrentAccount;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// URL không chứa id: NCC chỉ thao tác được hồ sơ của chính mình.
// SecurityConfig của Lâm đã chặn /api/provider/** chỉ cho role PROVIDER.
// Id lấy từ token đăng nhập, không tin id từ client.
@RestController
@RequestMapping("/api/provider/profile")
@RequiredArgsConstructor
public class ProviderProfileController {

    private final ProviderProfileService service;

    @GetMapping
    public ProviderProfileResponse getMine(@AuthenticationPrincipal CurrentAccount me) {
        return service.getMine(me.getId());
    }

    @PutMapping
    public ProviderProfileResponse updateMine(@AuthenticationPrincipal CurrentAccount me,
                                              @Valid @RequestBody UpdateProviderProfileRequest req) {
        return service.updateMine(me.getId(), req);
    }
}