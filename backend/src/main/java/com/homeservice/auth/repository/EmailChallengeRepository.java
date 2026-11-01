package com.homeservice.auth.repository;

import com.homeservice.auth.entity.EmailChallenge;
import com.homeservice.auth.enums.EmailChallengePurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface EmailChallengeRepository extends JpaRepository<EmailChallenge, Long> {
    boolean existsByEmail(String email);

    @Modifying
    @Query("delete from EmailChallenge c where c.account.id = :id")
    int deleteByAccountId(@Param("id") Long id);

    @Modifying
    @Query("delete from EmailChallenge c where c.providerApplication.id = :id")
    int deleteByProviderApplicationId(@Param("id") Long id);

    Optional<EmailChallenge> findFirstByAccountIdAndPurposeOrderByIdDesc(Long accountId, EmailChallengePurpose purpose);
    Optional<EmailChallenge> findFirstByProviderApplicationIdAndPurposeOrderByIdDesc(
            Long providerApplicationId, EmailChallengePurpose purpose);
}
