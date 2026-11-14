package com.homeservice.booking.dto.response;

import lombok.Getter;
import lombok.Setter;

// Tóm tắt tiền của đơn (UC10). Danh sách từng giao dịch thuộc UC45 của Lâm
@Getter
@Setter
public class BookingPaymentSummaryResponse {

    // Tổng tiền khách đã thực trả thành công (VND)
    private Long paidAmountVnd;

    // Tiền cần hoàn cho khách; null nghĩa là chưa xác định
    private Long refundDueVnd;

    // Đã trả cọc và đã trả phần còn lại chưa
    private Boolean depositPaid;
    private Boolean balancePaid;
}
