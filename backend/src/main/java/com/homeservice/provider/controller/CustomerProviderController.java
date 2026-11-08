package com.homeservice.provider.controller;

import com.homeservice.provider.dto.response.ProviderPublicResponse;
import com.homeservice.provider.service.ProviderPublicService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customer/providers")
@RequiredArgsConstructor
public class CustomerProviderController {

    private final ProviderPublicService providerPublicService;

    // UC07: xem hồ sơ công khai của một NCC
    @GetMapping("/{id}")
    public ProviderPublicResponse getPublicProfile(@PathVariable Long id) {
        return providerPublicService.getPublicProfile(id);
    }
}
