package com.homeservice.support.controller;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.chat.dto.request.SendMessageRequest;
import com.homeservice.chat.dto.response.MessagePageResponse;
import com.homeservice.chat.dto.response.MessageResponse;
import com.homeservice.common.dto.PageResponse;
import com.homeservice.common.dto.StandardResponse;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.security.CurrentAccount;
import com.homeservice.support.dto.request.CreateComplaintRequest;
import com.homeservice.support.dto.request.CustomerComplaintFilter;
import com.homeservice.support.dto.response.CustomerComplaintDetailResponse;
import com.homeservice.support.dto.response.CustomerComplaintSummaryResponse;
import com.homeservice.support.service.ComplaintService;
import com.homeservice.support.service.SupportChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller dành cho Khách hàng gửi, theo dõi yêu cầu hỗ trợ / khiếu nại và trao đổi chat hỗ trợ (UC 39).
 */
@RestController
@RequestMapping({"/api/v1/customer/complaints", "/api/customer/complaints"})
@RequiredArgsConstructor
public class CustomerComplaintController {

    private final ComplaintService complaintService;
    private final SupportChatService supportChatService;
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

    /**
     * Xem danh sách yêu cầu hỗ trợ / khiếu nại của chính khách hàng (lọc động & phân trang).
     * Yêu cầu quyền ROLE_CUSTOMER.
     */
    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public StandardResponse<PageResponse<CustomerComplaintSummaryResponse>> getMyComplaints(
            Authentication authentication,
            @Valid CustomerComplaintFilter filter
    ) {
        Long customerId = resolveCustomerId(authentication);
        PageResponse<CustomerComplaintSummaryResponse> response = complaintService.getCustomerComplaints(customerId, filter);
        return StandardResponse.success("Lấy danh sách yêu cầu hỗ trợ thành công", response);
    }

    /**
     * Xem chi tiết 1 yêu cầu hỗ trợ / khiếu nại của chính khách hàng (kiểm tra IDOR).
     * Yêu cầu quyền ROLE_CUSTOMER.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public StandardResponse<CustomerComplaintDetailResponse> getMyComplaintDetail(
            Authentication authentication,
            @PathVariable("id") Long complaintId
    ) {
        Long customerId = resolveCustomerId(authentication);
        CustomerComplaintDetailResponse response = complaintService.getCustomerComplaintDetail(customerId, complaintId);
        return StandardResponse.success("Lấy chi tiết yêu cầu hỗ trợ thành công", response);
    }

    /**
     * Lấy lịch sử tin nhắn hỗ trợ (hỗ trợ cursor beforeId tải ngược và polling afterId lấy tin mới).
     * Yêu cầu quyền ROLE_CUSTOMER và là chính chủ khiếu nại.
     */
    @GetMapping("/{id}/messages")
    @PreAuthorize("hasRole('CUSTOMER')")
    public StandardResponse<MessagePageResponse> getMyComplaintMessages(
            Authentication authentication,
            @PathVariable("id") Long complaintId,
            @RequestParam(value = "beforeId", required = false) Long beforeId,
            @RequestParam(value = "afterId", required = false) Long afterId,
            @RequestParam(value = "limit", required = false) Integer limit
    ) {
        Long customerId = resolveCustomerId(authentication);
        MessagePageResponse response = supportChatService.getCustomerMessages(customerId, complaintId, beforeId, afterId, limit);
        return StandardResponse.success("Lấy lịch sử tin nhắn hỗ trợ thành công", response);
    }

    /**
     * Khách hàng gửi tin nhắn mới trong cuộc trò chuyện hỗ trợ (chỉ khi OPEN hoặc IN_REVIEW).
     * Yêu cầu quyền ROLE_CUSTOMER và là chính chủ khiếu nại.
     */
    @PostMapping("/{id}/messages")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.CREATED)
    public StandardResponse<MessageResponse> sendMyComplaintMessage(
            Authentication authentication,
            @PathVariable("id") Long complaintId,
            @Valid @RequestBody SendMessageRequest request
    ) {
        Long customerId = resolveCustomerId(authentication);
        MessageResponse response = supportChatService.sendCustomerMessage(customerId, complaintId, request);
        return StandardResponse.success("Gửi tin nhắn hỗ trợ thành công", response);
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
