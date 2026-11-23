package com.homeservice.chat.dto.response;

import com.homeservice.account.enums.AccountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * DTO đại diện cho một tin nhắn trong cuộc trò chuyện.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageResponse {

    private Long id;
    private Long conversationId;
    private Long senderId;
    private AccountType senderType;
    private String senderDisplayName;
    private Long bookingId;
    private String body;
    private Instant readAt;
    private Instant createdAt;
}
