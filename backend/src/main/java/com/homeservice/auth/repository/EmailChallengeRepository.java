package com.homeservice.auth.repository;

import com.homeservice.auth.entity.EmailChallenge;
import com.homeservice.auth.enums.EmailChallengePurpose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmailChallengeRepository extends JpaRepository<EmailChallenge, Long> {
    Optional<EmailChallenge> findFirstByAccountIdAndPurposeOrderByIdDesc(Long accountId, EmailChallengePurpose purpose);
}
