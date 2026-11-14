package com.homeservice.booking.dto.request;

import com.homeservice.booking.enums.BookingStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

// Tham số danh sách đơn (UC10, UC40), gửi qua query string
@Getter
@Setter
public class BookingListRequest {

    // Lọc theo trạng thái đơn, để trống là lấy tất cả
    private BookingStatus status;

    // Phân trang: trang đầu tiên là 0
    @Min(value = 0, message = "Trang phải từ 0")
    private int page = 0;

    @Min(value = 1, message = "Kích thước trang tối thiểu là 1")
    @Max(value = 50, message = "Kích thước trang tối đa là 50")
    private int size = 10;
}
