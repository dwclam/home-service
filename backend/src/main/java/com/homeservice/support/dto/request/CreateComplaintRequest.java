package com.homeservice.support.dto.request;

import com.homeservice.support.enums.ComplaintCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request tạo yêu cầu hỗ trợ / khiếu nại của Khách hàng (UC 39).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateComplaintRequest {

    @NotNull(message = "Danh mục hỗ trợ không được để trống")
    private ComplaintCategory category;

    private Long bookingId;

    @NotBlank(message = "Tiêu đề yêu cầu không được để trống")
    @Size(min = 5, max = 200, message = "Tiêu đề yêu cầu phải từ 5 đến 200 ký tự")
    private String subject;

    @NotBlank(message = "Nội dung mô tả không được để trống")
    @Size(min = 10, max = 2000, message = "Nội dung mô tả phải từ 10 đến 2000 ký tự")
    private String description;
}
