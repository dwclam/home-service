package com.homeservice.chat.repository;

import com.homeservice.chat.entity.Conversation;
import com.homeservice.chat.enums.ConversationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByComplaintId(Long complaintId);

    Optional<Conversation> findByComplaintIdAndType(Long complaintId, ConversationType type);

    List<Conversation> findByComplaintIdIn(Collection<Long> complaintIds);
}
