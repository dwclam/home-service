package com.homeservice.catalog.repository;

import com.homeservice.catalog.entity.ServiceOffering;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, Long> {
    List<ServiceOffering> findByProviderAccountId(Long providerId);
    Optional<ServiceOffering> findByIdAndProviderAccountId(Long id, Long providerId);
}
