package com.homeservice.provider.controller;

import com.homeservice.auth.dto.request.ResendVerificationRequest;
import com.homeservice.auth.dto.request.VerifyEmailRequest;
import com.homeservice.provider.dto.request.SubmitProviderApplicationRequest;
import com.homeservice.provider.dto.response.ProviderApplicationResponse;
import com.homeservice.provider.service.ProviderApplicationService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/provider-applications")
@RequiredArgsConstructor
public class ProviderApplicationController {
    private final ProviderApplicationService applications;

    @ModelAttribute
    void preventCaching(HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProviderApplicationResponse submit(@Valid @RequestBody SubmitProviderApplicationRequest request) {
        return applications.submit(request);
    }

    @PostMapping("/verify-email")
    public ProviderApplicationResponse verify(@Valid @RequestBody VerifyEmailRequest request) {
        return applications.verify(request.getEmail(), request.getCode(), request.getRegistrationToken());
    }

    @PostMapping("/resend-verification")
    public ProviderApplicationResponse resend(@Valid @RequestBody ResendVerificationRequest request) {
        return applications.resend(request.getEmail(), request.getRegistrationToken());
    }
}
