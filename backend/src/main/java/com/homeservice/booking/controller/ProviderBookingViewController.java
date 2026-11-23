package com.homeservice.booking.controller;

import com.homeservice.booking.dto.request.BookingListRequest;
import com.homeservice.booking.dto.response.BookingViewDetailResponse;
import com.homeservice.booking.dto.response.ProviderBookingListItemResponse;
import com.homeservice.booking.service.BookingViewService;
import com.homeservice.common.dto.PageResponse;
import com.homeservice.common.dto.StandardResponse;
import com.homeservice.security.CurrentAccount;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// UC40: NCC xem đơn được giao. Cùng đường dẫn gốc với ProviderBookingController của Thuỷ
// nhưng chỉ có GET, nên không trùng
@RestController
@RequestMapping({"/api/v1/provider/bookings", "/api/provider/bookings"})
@RequiredArgsConstructor
public class ProviderBookingViewController {

    private final BookingViewService bookingViewService;

    // Danh sách đơn được giao: ?status=PENDING_PROVIDER&page=0&size=10
    @GetMapping
    public StandardResponse<PageResponse<ProviderBookingListItemResponse>> list(
            @AuthenticationPrincipal CurrentAccount me,
            @Valid @ModelAttribute BookingListRequest req
    ) {
        return StandardResponse.success("Lấy danh sách đơn được giao thành công",
                bookingViewService.listForProvider(me.getId(), req));
    }

    // Chi tiết một đơn được giao
    @GetMapping("/{bookingId}")
    public StandardResponse<BookingViewDetailResponse> detail(
            @AuthenticationPrincipal CurrentAccount me,
            @PathVariable Long bookingId
    ) {
        return StandardResponse.success("Lấy chi tiết đơn được giao thành công",
                bookingViewService.getForProvider(me.getId(), bookingId));
    }
}