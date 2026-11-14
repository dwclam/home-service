package com.homeservice.booking.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

/**
 * Kết quả thực hiện tác vụ quét và tự động hết hạn các đơn đặt lịch (UC 51).
 */
@Builder
public record BookingExpirationResult(
        int providerExpiredCount,
        int depositExpiredCount,
        int totalErrors
) {
    @JsonProperty("totalExpiredCount")
    public int totalExpiredCount() {
        return providerExpiredCount + depositExpiredCount;
    }
}

