package com.homeservice.support.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request đóng khiếu nại dành cho Admin: kết luận giải quyết (RESOLVED) hoặc từ chối (REJECTED) (UC 33).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminCloseComplaintRequest {

    @NotBlank(message = "Nội dung kết luận xử lý không được để trống")
    @Size(min = 5, max = 1000, message = "Nội dung kết luận xử lý phải từ 5 đến 1000 ký tự")
    private String resolution;
}
