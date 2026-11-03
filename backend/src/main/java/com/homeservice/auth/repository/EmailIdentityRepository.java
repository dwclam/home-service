package com.homeservice.auth.repository;

import com.homeservice.auth.entity.EmailIdentity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailIdentityRepository extends JpaRepository<EmailIdentity, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from EmailIdentity i where i.email = :email")
    Optional<EmailIdentity> findByEmailForUpdate(@Param("email") String email);
}
