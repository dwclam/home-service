package com.homeservice.booking.controller;

import com.homeservice.booking.dto.request.BookingListRequest;
import com.homeservice.booking.dto.response.BookingResponse;
import com.homeservice.booking.dto.response.BookingViewDetailResponse;
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

// UC10: khách xem đơn của mình. Cùng đường dẫn gốc với CustomerBookingController của Thuỷ
// nhưng chỉ có GET, nên không trùng
@RestController
@RequestMapping({"/api/v1/customer/bookings", "/api/customer/bookings"})
@RequiredArgsConstructor
public class CustomerBookingViewController {

    private final BookingViewService bookingViewService;

    // Danh sách đơn của mình: ?status=CONFIRMED&page=0&size=10
    @GetMapping
    public StandardResponse<PageResponse<BookingResponse>> list(
            @AuthenticationPrincipal CurrentAccount me,
            @Valid @ModelAttribute BookingListRequest req
    ) {
        return StandardResponse.success("Lấy danh sách đơn đặt lịch thành công",
                bookingViewService.listForCustomer(me.getId(), req));
    }

    // Chi tiết một đơn của mình
    @GetMapping("/{bookingId}")
    public StandardResponse<BookingViewDetailResponse> detail(
            @AuthenticationPrincipal CurrentAccount me,
            @PathVariable Long bookingId
    ) {
        return StandardResponse.success("Lấy chi tiết đơn đặt lịch thành công",
                bookingViewService.getForCustomer(me.getId(), bookingId));
    }
}
