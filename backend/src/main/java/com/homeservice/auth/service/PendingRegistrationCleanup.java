package com.homeservice.auth.service;

import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.auth.entity.EmailIdentity;
import com.homeservice.auth.repository.EmailChallengeRepository;
import com.homeservice.auth.repository.EmailIdentityRepository;
import com.homeservice.provider.enums.ProviderApplicationStatus;
import com.homeservice.provider.repository.ProviderApplicationRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PendingRegistrationCleanup {
    private final EmailIdentityRepository identities;
    private final AccountRepository accounts;
    private final ProviderApplicationRepository applications;
    private final EmailChallengeRepository challenges;
    private final PendingRegistrationPolicy policy;
    private final EntityManager entityManager;

    public PendingRegistrationCleanup(EmailIdentityRepository identities, AccountRepository accounts,
            ProviderApplicationRepository applications, EmailChallengeRepository challenges,
            PendingRegistrationPolicy policy, EntityManager entityManager) {
        this.identities = identities;
        this.accounts = accounts;
        this.applications = applications;
        this.challenges = challenges;
        this.policy = policy;
        this.entityManager = entityManager;
    }

    // The caller's transaction holds locks until the replacement registration commits.
    // Every affected path locks identity first, then account, then applications by ID.
    @Transactional(propagation = Propagation.MANDATORY)
    public int cleanupLocked(String email) {
        EmailIdentity identity = identities.findByEmailForUpdate(email).orElse(null);
        var account = accounts.findByEmailForUpdate(email).orElse(null);
        var submissions = applications.findAllByEmailForUpdate(email);
        int removed = 0;
        if (account != null && account.getAccountType() == AccountType.CUSTOMER
                && account.getStatus() == AccountStatus.PENDING_EMAIL && policy.expired(account.getCreatedAt())) {
            challenges.deleteByAccountId(account.getId());
            accounts.delete(account);
            accounts.flush();
            removed++;
        }
        for (var application : submissions) {
            if (application.getStatus() == ProviderApplicationStatus.PENDING_EMAIL && policy.expired(application.getCreatedAt())) {
                challenges.deleteByProviderApplicationId(application.getId());
                applications.delete(application);
                applications.flush();
                removed++;
            }
        }
        if (identity != null && removed > 0 && accounts.findByEmail(email).isEmpty()
                && !applications.existsByEmail(email) && !challenges.existsByEmail(email)) {
            identities.delete(identity);
            identities.flush();
            entityManager.detach(identity);
        }
        return removed;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int cleanupInNewTransaction(String email) { return cleanupLocked(email); }

    @Transactional(propagation = Propagation.MANDATORY)
    public EmailIdentity reserve(String email, AccountType type) {
        EmailIdentity identity = identities.findByEmailForUpdate(email).orElse(null);
        if (identity == null) {
            identity = new EmailIdentity(email, type);
            try {
                // Persist, not merge: concurrent creation must never overwrite another type.
                entityManager.persist(identity);
                entityManager.flush();
            } catch (ConstraintViolationException ex) {
                throw new DataIntegrityViolationException("Email reservation conflict", ex);
            }
        }
        return identity;
    }
}
