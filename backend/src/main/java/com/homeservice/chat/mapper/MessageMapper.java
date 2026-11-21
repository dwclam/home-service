package com.homeservice.chat.mapper;

import com.homeservice.account.entity.Account;
import com.homeservice.chat.dto.response.MessageResponse;
import com.homeservice.chat.entity.Message;
import org.springframework.stereotype.Component;

/**
 * Mapper chuyển đổi Entity Message sang DTO MessageResponse (dùng chung cho các luồng chat).
 */
@Component
public class MessageMapper {

    public MessageResponse toResponse(Message message) {
        if (message == null) {
            return null;
        }
        Account sender = message.getSender();
        return MessageResponse.builder()
                .id(message.getId())
                .conversationId(message.getConversation() != null ? message.getConversation().getId() : null)
                .senderId(sender != null ? sender.getId() : null)
                .senderType(sender != null ? sender.getAccountType() : null)
                .senderDisplayName(sender != null ? sender.getDisplayName() : null)
                .bookingId(message.getBooking() != null ? message.getBooking().getId() : null)
                .body(message.getBody())
                .readAt(message.getReadAt())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
