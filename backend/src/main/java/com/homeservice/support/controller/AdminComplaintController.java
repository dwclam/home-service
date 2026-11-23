package com.homeservice.support.controller;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.common.dto.PageResponse;
import com.homeservice.common.dto.StandardResponse;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.security.CurrentAccount;
import com.homeservice.support.dto.request.AdminAssignComplaintRequest;
import com.homeservice.support.dto.request.AdminCloseComplaintRequest;
import com.homeservice.support.dto.request.AdminComplaintSearchFilter;
import com.homeservice.support.dto.response.AdminComplaintDetailResponse;
import com.homeservice.support.dto.response.AdminComplaintSummaryResponse;
import com.homeservice.support.service.ComplaintService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller dành cho Quản trị viên (Admin) tiếp nhận, tra cứu và xử lý khiếu nại (UC 33).
 */
@RestController
@RequestMapping({"/api/v1/admin/complaints", "/api/admin/complaints"})
@RequiredArgsConstructor
public class AdminComplaintController {

    private final ComplaintService complaintService;
    private final AccountRepository accountRepository;

    /**
     * Tra cứu toàn bộ danh sách khiếu nại toàn hệ thống kèm lọc đa tiêu chí & phân trang (UC 33).
     * Yêu cầu quyền ROLE_ADMIN.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public StandardResponse<PageResponse<AdminComplaintSummaryResponse>> getComplaints(
            Authentication authentication,
            @Valid AdminComplaintSearchFilter filter
    ) {
        resolveAdminId(authentication);
        PageResponse<AdminComplaintSummaryResponse> response = complaintService.getAdminComplaints(filter);
        return StandardResponse.success("Lấy danh sách khiếu nại thành công", response);
    }

    /**
     * Xem chi tiết toàn diện 360° một khiếu nại dành cho Admin (UC 33).
     * Yêu cầu quyền ROLE_ADMIN.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public StandardResponse<AdminComplaintDetailResponse> getComplaintDetail(
            Authentication authentication,
            @PathVariable("id") Long complaintId
    ) {
        Long adminId = resolveAdminId(authentication);
        AdminComplaintDetailResponse response = complaintService.getAdminComplaintDetail(adminId, complaintId);
        return StandardResponse.success("Lấy chi tiết khiếu nại thành công", response);
    }

    /**
     * Tiếp nhận xử lý khiếu nại (OPEN -> IN_REVIEW) hoặc chuyển giao Admin phụ trách khác (reassign) (UC 33).
     * Yêu cầu quyền ROLE_ADMIN + CSRF token.
     */
    @PostMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public StandardResponse<AdminComplaintDetailResponse> assignComplaint(
            Authentication authentication,
            @PathVariable("id") Long complaintId,
            @Valid @RequestBody(required = false) AdminAssignComplaintRequest request
    ) {
        Long adminId = resolveAdminId(authentication);
        AdminComplaintDetailResponse response = complaintService.assignComplaintByAdmin(adminId, complaintId, request);
        return StandardResponse.success("Phân công xử lý khiếu nại thành công", response);
    }

    /**
     * Kết luận giải quyết khiếu nại (IN_REVIEW -> RESOLVED) (UC 33).
     * Chỉ Admin đang phụ trách khiếu nại mới được phép chốt kết luận.
     * Yêu cầu quyền ROLE_ADMIN + CSRF token.
     */
    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public StandardResponse<AdminComplaintDetailResponse> resolveComplaint(
            Authentication authentication,
            @PathVariable("id") Long complaintId,
            @Valid @RequestBody AdminCloseComplaintRequest request
    ) {
        Long adminId = resolveAdminId(authentication);
        AdminComplaintDetailResponse response = complaintService.resolveComplaintByAdmin(adminId, complaintId, request);
        return StandardResponse.success("Kết luận giải quyết khiếu nại thành công", response);
    }

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
