package com.homeservice.booking.dto.response;

import com.homeservice.booking.enums.BookingStatus;
import com.homeservice.common.enums.ActorType;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

// Một lần chuyển trạng thái của đơn
@Getter
@Setter
public class BookingHistoryItemResponse {

    // Trạng thái trước (null khi đơn vừa được tạo)
    private BookingStatus fromStatus;
    private BookingStatus toStatus;

    // Ai thực hiện: khách, NCC, admin hay hệ thống
    private ActorType actorType;

    private String reasonCode;
    private String note;
    private Instant createdAt;
}