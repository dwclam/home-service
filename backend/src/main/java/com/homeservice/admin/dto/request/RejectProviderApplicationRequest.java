package com.homeservice.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RejectProviderApplicationRequest {
    @NotBlank(message = "Vui lòng nhập lý do từ chối.")
    @Size(max = 2_000, message = "Lý do từ chối tối đa 2.000 ký tự.")
    private String reason;

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason == null ? null : reason.strip();
    }
}
