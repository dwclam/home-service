package com.homeservice.catalog.controller;

import com.homeservice.catalog.dto.ServiceAvailableSlotsResponse;
import com.homeservice.catalog.service.ServiceAvailabilityService;
import com.homeservice.common.dto.StandardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

/**
 * Controller xử lý UC38 — Khách hàng xem lịch rảnh và giá của dịch vụ.
 * <p>
 * Yêu cầu: Khách hàng đã đăng nhập (ROLE_CUSTOMER theo ràng buộc C01).
 */
@RestController
@RequestMapping({"/api/v1/customer/services", "/api/customer/services"})
@RequiredArgsConstructor
public class CustomerServiceAvailabilityController {

    private final ServiceAvailabilityService serviceAvailabilityService;

    /**
     * Tra cứu các khoảng lịch rảnh khả dụng của một dịch vụ cụ thể.
     * <p>
     * Nếu không truyền {@code from}: mặc định là now + 60 phút (theo lead-time tối thiểu).
     * Nếu không truyền {@code to}: mặc định là 1 tuần kể từ now.
     *
     * @param serviceId ID của dịch vụ
     * @param from      Thời điểm bắt đầu tra cứu (tùy chọn, ISO-8601, ví dụ: 2026-11-09T00:00:00Z)
     * @param to        Thời điểm kết thúc tra cứu (tùy chọn, ISO-8601, ví dụ: 2026-11-16T23:59:59Z)
     * @return Danh sách khoảng thời gian khả dụng kèm thông tin tóm tắt dịch vụ & NCC
     */
    @GetMapping("/{serviceId}/available-slots")
    public StandardResponse<ServiceAvailableSlotsResponse> getAvailableSlots(
            @PathVariable Long serviceId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        ServiceAvailableSlotsResponse response = serviceAvailabilityService.getAvailableSlots(serviceId, from, to);
        return StandardResponse.success("Lấy danh sách lịch rảnh thành công", response);
    }
}
