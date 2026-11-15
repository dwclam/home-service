package com.homeservice.audit.repository;

import com.homeservice.audit.entity.AdminAuditLog;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {

    @EntityGraph(attributePaths = {"admin"})
    List<AdminAuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, String entityId);
}
