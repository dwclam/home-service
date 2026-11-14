package com.homeservice.auth.job;

import com.homeservice.account.repository.AccountRepository;
import com.homeservice.auth.service.PendingRegistrationCleanup;
import com.homeservice.config.properties.AuthProperties;
import com.homeservice.provider.repository.ProviderApplicationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.Clock;
import java.time.Instant;
import java.util.TreeSet;

@Component
public class PendingRegistrationCleanupJob {
    private static final Logger log = LoggerFactory.getLogger(PendingRegistrationCleanupJob.class);
    private final AccountRepository accounts;
    private final ProviderApplicationRepository applications;
    private final PendingRegistrationCleanup cleanup;
    private final AuthProperties properties;
    private final Clock clock;

    public PendingRegistrationCleanupJob(AccountRepository accounts, ProviderApplicationRepository applications,
            PendingRegistrationCleanup cleanup, AuthProperties properties, Clock clock) {
        this.accounts = accounts;
        this.applications = applications;
        this.cleanup = cleanup;
        this.properties = properties;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${app.auth.pending-cleanup.interval:1h}")
    public void run() {
        if (!properties.pendingCleanup().enabled()) return;
        Instant cutoff = clock.instant().minus(properties.pendingRegistrationTtl());
        int size = properties.pendingCleanup().batchSize();
        int removed = 0, errors = 0;
        String cursor = null;
        while (true) {
            var page = PageRequest.of(0, size);
            var candidates = new TreeSet<String>();
            candidates.addAll(accounts.findExpiredEmails(cutoff, cursor, page));
            candidates.addAll(applications.findExpiredEmails(cutoff, cursor, page));
            if (candidates.isEmpty()) break;
            // A keyset cursor also advances past failures, so one bad row cannot stall the run.
            for (String email : candidates.stream().limit(size).toList()) {
                cursor = email;
                try { removed += cleanup.cleanupInNewTransaction(email); }
                catch (RuntimeException ex) {
                    errors++;
                    log.warn("Pending registration cleanup failed for email hash {}: {}", Integer.toHexString(email.hashCode()), ex.toString());
                }
            }
        }
        log.info("Pending registration cleanup: {} registrations removed, {} errors", removed, errors);
    }
}
