package com.homeservice.chat.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request gửi tin nhắn văn bản trong cuộc trò chuyện (dùng chung cho Chat Hỗ trợ UC33/UC39 và Chat NCC UC13/UC24).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SendMessageRequest {

    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    @Size(min = 1, max = 2000, message = "Nội dung tin nhắn phải từ 1 đến 2000 ký tự")
    private String body;

    private Long bookingId;
}
