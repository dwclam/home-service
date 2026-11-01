package com.homeservice.auth.repository;

import com.homeservice.auth.entity.EmailIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmailIdentityRepository extends JpaRepository<EmailIdentity, String> {
}
