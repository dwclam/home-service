package com.homeservice.provider.repository;

import com.homeservice.provider.entity.ProviderApplication;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProviderApplicationRepository extends JpaRepository<ProviderApplication, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from ProviderApplication p where p.email = :email order by p.id")
    List<ProviderApplication> findAllByEmailForUpdate(@Param("email") String email);

    boolean existsByEmail(String email);

    @Query("select distinct p.email from ProviderApplication p where p.status = com.homeservice.provider.enums.ProviderApplicationStatus.PENDING_EMAIL and p.createdAt <= :cutoff and (:after is null or p.email > :after) order by p.email")
    List<String> findExpiredEmails(@Param("cutoff") Instant cutoff, @Param("after") String after, Pageable page);

    // Callers that change a submission must first lock its EmailIdentity.
    Optional<ProviderApplication> findFirstByEmailOrderByIdDesc(String email);
}
