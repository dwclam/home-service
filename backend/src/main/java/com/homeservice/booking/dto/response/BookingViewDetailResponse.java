package com.homeservice.booking.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

// Chi tiết đơn cho UC10 (khách) và UC40 (NCC).
// Kế thừa BookingDetailResponse của Thuỷ, thêm tóm tắt tiền và lịch sử trạng thái
@Getter
@Setter
public class BookingViewDetailResponse extends BookingDetailResponse {

    // Tóm tắt tiền; null ở UC40 (NCC không xem phần này)
    private BookingPaymentSummaryResponse paymentSummary;

    // Lịch sử chuyển trạng thái, xếp theo thời gian tăng dần
    private List<BookingHistoryItemResponse> history = new ArrayList<>();
}