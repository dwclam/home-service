package com.homeservice.auth.repository;

import com.homeservice.auth.entity.EmailIdentity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailIdentityRepository extends JpaRepository<EmailIdentity, String> {
}
