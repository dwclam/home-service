package com.homeservice.booking.policy;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;
import java.time.Instant;

/**
 * Cấu hình các tham số chính sách (Policy) cố định cho Đơn đặt lịch (Booking).
 * <p>
 * Toàn bộ giá trị được quản lý tập trung từ cấu hình hệ thống (application.yaml),
 * đảm bảo tính bất biến (snapshotting) tại thời điểm tạo đơn và client không được phép can thiệp.
 */
@Getter
@Setter
@Validated
@Component
@ConfigurationProperties(prefix = "app.booking.policy")
public class BookingPolicyProperties {

    /**
     * Tỷ lệ tiền cọc snapshot (database: bookings.deposit_percent, mặc định: 30%).
     */
    @Min(0)
    @Max(100)
    private int depositPercent = 30;

    /**
     * Tỷ lệ hoa hồng Nestify hưởng snapshot (database: bookings.platform_fee_percent, mặc định: 20%).
     */
    @Min(0)
    @Max(100)
    private int platformFeePercent = 20;

    /**
     * Mốc thời gian phân định hủy sớm / sát giờ snapshot (database: bookings.cancel_cutoff_minutes, mặc định: 30 phút).
     */
    @PositiveOrZero
    private int cancelCutoffMinutes = 30;

    /**
     * Tỷ lệ hoàn cọc khi khách hủy sớm (database: bookings.early_refund_percent, mặc định: 50%).
     */
    @Min(0)
    @Max(100)
    private int earlyRefundPercent = 50;

    /**
     * Tỷ lệ hoàn cọc khi khách hủy sát giờ (database: bookings.late_refund_percent, mặc định: 0%).
     */
    @Min(0)
    @Max(100)
    private int lateRefundPercent = 0;

    /**
     * Tỷ lệ hoàn khi NCC hủy hoặc từ chối (database: bookings.provider_refund_percent, mặc định: 100%).
     */
    @Min(0)
    @Max(100)
    private int providerRefundPercent = 100;

    /**
     * Tỷ lệ hoàn mặc định khi hết hạn hoặc lỗi hệ thống (database: bookings.system_refund_percent, mặc định: 100%).
     */
    @Min(0)
    @Max(100)
    private int systemRefundPercent = 100;

    /**
     * Lead-time tối thiểu khi đặt lịch trước giờ bắt đầu làm (MD01, mặc định: 60 phút).
     */
    @Positive
    private int leadTimeMinutes = 60;

    /**
     * Thời gian tối đa chờ NCC phản hồi trước khi đơn hết hạn (MD01, mặc định: 30 phút).
     */
    @Positive
    private int requestExpireMinutes = 30;

    /**
     * Tính toán số tiền cọc (làm tròn theo quy tắc ROUND_HALF_UP).
     */
    public long calculateDepositAmountVnd(long totalAmountVnd) {
        return Math.round(totalAmountVnd * (double) depositPercent / 100.0);
    }

    /**
     * Tính toán số tiền còn lại phải thanh toán ở đợt 2 (70%).
     */
    public long calculateBalanceAmountVnd(long totalAmountVnd, long depositAmountVnd) {
        return totalAmountVnd - depositAmountVnd;
    }

    /**
     * Tính toán thời điểm hết hạn yêu cầu chờ NCC phản hồi:
     * request_expires_at = min(now + requestExpireMinutes, startsAt - requestExpireMinutes) (MD01).
     */
    public Instant calculateRequestExpiresAt(Instant now, Instant startsAt) {
        Instant expireAtTimeout = now.plus(Duration.ofMinutes(requestExpireMinutes));
        Instant expireCutoff = startsAt.minus(Duration.ofMinutes(requestExpireMinutes));
        return expireAtTimeout.isBefore(expireCutoff) ? expireAtTimeout : expireCutoff;
    }
}
