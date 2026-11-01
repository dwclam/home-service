package com.homeservice.provider.repository;

import com.homeservice.provider.entity.ProviderProfile;
import org.springframework.data.jpa.repository.JpaRepository;

// Khóa chính của ProviderProfile là account_id nên findById(accountId) có sẵn
public interface ProviderProfileRepository extends JpaRepository<ProviderProfile, Long> {
}