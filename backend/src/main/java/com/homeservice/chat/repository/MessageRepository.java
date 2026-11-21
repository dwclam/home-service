package com.homeservice.chat.repository;

import com.homeservice.chat.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdOrderByIdAsc(Long conversationId);

    /**
     * Lấy tin nhắn mới nhất của mỗi cuộc hội thoại trong danh sách (batch query, tránh N+1).
     */
    @Query("SELECT m FROM Message m " +
           "WHERE m.id IN (" +
           "    SELECT MAX(m2.id) FROM Message m2 " +
           "    WHERE m2.conversation.id IN :conversationIds " +
           "    GROUP BY m2.conversation.id" +
           ")")
    List<Message> findLatestByConversationIdIn(@Param("conversationIds") Collection<Long> conversationIds);
}
