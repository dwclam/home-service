package com.homeservice.support.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request tiếp nhận xử lý (OPEN -> IN_REVIEW) hoặc chuyển giao Admin phụ trách (IN_REVIEW -> IN_REVIEW) cho UC 33.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAssignComplaintRequest {

    /**
     * ID tài khoản Admin được phân công. Nếu null, hệ thống tự gán cho chính Admin đang gọi API.
     */
    private Long targetAdminId;

    /**
     * Lý do phân công / chuyển giao.
     * Tùy chọn khi nhận mới từ OPEN -> IN_REVIEW; BẮT BUỘC từ 5 đến 500 ký tự khi chuyển giao (reassign) từ IN_REVIEW.
     */
    @Size(max = 500, message = "Lý do phân công không được vượt quá 500 ký tự")
    private String reason;
}
