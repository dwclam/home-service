package com.homeservice.booking.policy;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

/**
 * Cấu hình tham số cho tác vụ quét và tự động hết hạn đơn đặt lịch (UC 51).
 * <p>
 * Quản lý chu kỳ chạy, bật/tắt tác vụ nền và kích thước batch xử lý an toàn.
 */
@Getter
@Setter
@Validated
@Component
@ConfigurationProperties(prefix = "app.booking.expiration")
public class BookingExpirationProperties {

    /**
     * Bật/tắt tác vụ quét định kỳ (mặc định: true).
     */
    private boolean enabled = true;

    /**
     * Biểu thức cron cho tác vụ quét định kỳ (mặc định: 0 * * * * * - mỗi phút tại giây thứ 0).
     */
    @NotBlank
    private String cron = "0 * * * * *";

    /**
     * Khoảng thời gian giãn cách giữa các lần chạy (mặc định: 60s).
     */
    private Duration interval = Duration.ofSeconds(60);

    /**
     * Số lượng bản ghi tối đa được xử lý trong mỗi batch để chống tràn bộ nhớ (mặc định: 50).
     */
    @Positive
    private int batchSize = 50;
}
