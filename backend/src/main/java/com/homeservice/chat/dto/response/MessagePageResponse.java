package com.homeservice.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * DTO phân trang cursor cho danh sách tin nhắn (hỗ trợ tải ngược beforeId và polling afterId).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessagePageResponse {

    private Long conversationId;
    private Long complaintId;
    private boolean canSendMessage;
    private boolean hasMore;
    private Long nextBeforeId;
    private Long lastMessageId;
    private List<MessageResponse> items;
}
