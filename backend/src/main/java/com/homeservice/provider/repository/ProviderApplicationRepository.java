package com.homeservice.provider.repository;

import com.homeservice.provider.entity.ProviderApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProviderApplicationRepository extends JpaRepository<ProviderApplication, Long> {
}
