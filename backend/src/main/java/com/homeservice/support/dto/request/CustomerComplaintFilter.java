package com.homeservice.support.dto.request;

import com.homeservice.support.enums.ComplaintCategory;
import com.homeservice.support.enums.ComplaintStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Tham số lọc và phân trang danh sách yêu cầu hỗ trợ / khiếu nại của Khách hàng (UC 39).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerComplaintFilter {

    private ComplaintStatus status;
    private ComplaintCategory category;
    private Long bookingId;

    @Builder.Default
    private Integer page = 0;

    @Builder.Default
    private Integer size = 20;
}
