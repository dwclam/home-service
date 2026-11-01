package com.homeservice.account.repository;

import com.homeservice.account.entity.Account;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;
import java.time.Instant;
import org.springframework.data.domain.Pageable;

public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByEmail(String email);

    @Query("select a.email from Account a where a.accountType = com.homeservice.account.enums.AccountType.CUSTOMER and a.status = com.homeservice.account.enums.AccountStatus.PENDING_EMAIL and a.createdAt <= :cutoff and (:after is null or a.email > :after) order by a.email")
    List<String> findExpiredEmails(@Param("cutoff") Instant cutoff, @Param("after") String after, Pageable page);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Account a where a.email = :email")
    Optional<Account> findByEmailForUpdate(@Param("email") String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Account a where a.id = :id")
    Optional<Account> findByIdForUpdate(@Param("id") Long id);
}
