package com.homeservice.catalog.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

/**
 * Một khoảng thời gian khả dụng để khách đặt lịch dịch vụ.
 * <p>
 * {@code startsAt} và {@code endsAt} là ranh giới của khoảng lịch rảnh thực tế (sau khi
 * đã trừ booking đang chiếm). Khách có thể chọn bất kỳ thời điểm bắt đầu X trong khoảng
 * [startsAt, endsAt - durationMinutes] để đặt lịch.
 */
@Getter
@Builder
public class AvailableSlotRange {

    /** Thời điểm bắt đầu sớm nhất của khoảng rảnh (inclusive). */
    private final Instant startsAt;

    /** Thời điểm kết thúc của khoảng rảnh (exclusive — theo quy ước [start, end)). */
    private final Instant endsAt;
}
