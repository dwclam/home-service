package com.homeservice.admin.controller;

import com.homeservice.admin.dto.request.RejectProviderApplicationRequest;
import com.homeservice.admin.dto.response.ProviderApplicationDecisionResponse;
import com.homeservice.admin.dto.response.ProviderApplicationDetailResponse;
import com.homeservice.admin.dto.response.ProviderApplicationSummaryResponse;
import com.homeservice.admin.service.AdminProviderApplicationService;
import com.homeservice.common.dto.ApiError;
import com.homeservice.common.dto.PageResponse;
import com.homeservice.security.CurrentAccount;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/provider-applications")
@RequiredArgsConstructor
public class AdminProviderApplicationController {
    private final AdminProviderApplicationService applications;

    @ModelAttribute
    void preventCaching(HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
    }

    @GetMapping
    public PageResponse<ProviderApplicationSummaryResponse> list(@AuthenticationPrincipal CurrentAccount admin,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return applications.list(admin == null ? null : admin.getId(), status, page, size);
    }

    @GetMapping("/{id}")
    public ProviderApplicationDetailResponse detail(@AuthenticationPrincipal CurrentAccount admin,
                                                     @PathVariable Long id) {
        return applications.detail(admin == null ? null : admin.getId(), id);
    }

    @PostMapping("/{id}/approve")
    public ProviderApplicationDecisionResponse approve(@AuthenticationPrincipal CurrentAccount admin,
                                                        @PathVariable Long id) {
        return applications.approve(admin == null ? null : admin.getId(), id);
    }

    @PostMapping("/{id}/reject")
    public ProviderApplicationDecisionResponse reject(@AuthenticationPrincipal CurrentAccount admin,
                                                       @PathVariable Long id,
                                                       @Valid @RequestBody RejectProviderApplicationRequest request) {
        return applications.reject(admin == null ? null : admin.getId(), id, request.getReason());
    }

    @PostMapping("/{id}/reissue-credentials")
    public ProviderApplicationDecisionResponse reissueCredentials(@AuthenticationPrincipal CurrentAccount admin,
                                                                   @PathVariable Long id) {
        return applications.reissueCredentials(admin == null ? null : admin.getId(), id);
    }

    // Keep malformed numeric input consistent with this API's validation contract without changing other modules.
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiError invalidParameter(MethodArgumentTypeMismatchException exception) {
        return new ApiError("VALIDATION_ERROR", "Tham số không hợp lệ.",
                Map.of(exception.getName(), "Giá trị phải là số nguyên trong giới hạn được hỗ trợ."));
    }
}
