package com.homeservice.audit.service;

import com.homeservice.account.entity.Account;
import com.homeservice.audit.entity.AdminAuditLog;
import com.homeservice.audit.repository.AdminAuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminAuditLogService {
    private final AdminAuditLogRepository logs;
    private final ObjectMapper json;

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(Account admin, String action, String entityType, String entityId, String reason,
                       Map<String, ?> changes, Instant occurredAt) {
        var entry = new AdminAuditLog();
        entry.setAdmin(admin);
        entry.setAction(action);
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setReason(reason);
        entry.setChanges(json.writeValueAsString(changes));
        entry.setCreatedAt(occurredAt);
        logs.save(entry);
    }
}
