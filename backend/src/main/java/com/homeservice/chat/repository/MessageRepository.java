package com.homeservice.chat.repository;

import com.homeservice.chat.entity.Message;
import org.springframework.data.domain.Pageable;
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

    /**
     * Lấy trang tin nhắn mới nhất của cuộc hội thoại (sắp giảm dần theo id để cắt theo limit + 1).
     */
    @Query("SELECT m FROM Message m " +
           "JOIN FETCH m.sender " +
           "LEFT JOIN FETCH m.booking " +
           "WHERE m.conversation.id = :conversationId " +
           "ORDER BY m.id DESC")
    List<Message> findLatestPage(@Param("conversationId") Long conversationId, Pageable pageable);

    /**
     * Cursor phân trang ngược: lấy các tin nhắn cũ hơn beforeId (id < beforeId, sắp giảm dần).
     */
    @Query("SELECT m FROM Message m " +
           "JOIN FETCH m.sender " +
           "LEFT JOIN FETCH m.booking " +
           "WHERE m.conversation.id = :conversationId " +
           "AND m.id < :beforeId " +
           "ORDER BY m.id DESC")
    List<Message> findPageBeforeId(
            @Param("conversationId") Long conversationId,
            @Param("beforeId") Long beforeId,
            Pageable pageable
    );

    /**
     * Polling tin nhắn mới hơn afterId (id > afterId, sắp tăng dần theo id).
     */
    @Query("SELECT m FROM Message m " +
           "JOIN FETCH m.sender " +
           "LEFT JOIN FETCH m.booking " +
           "WHERE m.conversation.id = :conversationId " +
           "AND m.id > :afterId " +
           "ORDER BY m.id ASC")
    List<Message> findPageAfterId(
            @Param("conversationId") Long conversationId,
            @Param("afterId") Long afterId,
            Pageable pageable
    );
}
