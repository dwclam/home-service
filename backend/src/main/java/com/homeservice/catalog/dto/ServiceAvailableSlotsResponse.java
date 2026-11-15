package com.homeservice.catalog.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * UC38 — Response trả về danh sách khoảng thời gian khả dụng (lịch rảnh) của NCC
 * cho một dịch vụ cụ thể, kèm thông tin tóm tắt về dịch vụ và NCC.
 */
@Getter
@Builder
public class ServiceAvailableSlotsResponse {

    // ── Thông tin dịch vụ ──────────────────────────────────────────────────
    private Long serviceId;
    private String serviceTitle;
    /** Thời lượng thực hiện dịch vụ (phút). Khách phải chọn khoảng bắt đầu
     *  sao cho [startsAt, startsAt + durationMinutes] nằm trong một AvailableSlotRange. */
    private Integer durationMinutes;
    private Long basePriceVnd;

    // ── Thông tin NCC (tóm tắt, không tiết lộ thông tin tài chính/ngân hàng) ──
    private ProviderSummary provider;

    // ── Danh sách khoảng lịch rảnh ─────────────────────────────────────────
    /** Danh sách đã được sắp xếp tăng dần theo startsAt. */
    private List<AvailableSlotRange> availableSlots;

    /**
     * Thông tin tóm tắt về NCC hiển thị trong trang xem lịch rảnh của khách.
     * Không bao gồm thông tin tài chính (tài khoản ngân hàng, hoa hồng, v.v.).
     */
    @Getter
    @Builder
    public static class ProviderSummary {
        private Long providerId;
        private String businessName;
        private String city;
        private String logoUrl;
    }
}
