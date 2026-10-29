package com.homeservice.provider.repository;

import com.homeservice.provider.entity.ProviderProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProviderProfileRepository extends JpaRepository<ProviderProfile, Long> {
}