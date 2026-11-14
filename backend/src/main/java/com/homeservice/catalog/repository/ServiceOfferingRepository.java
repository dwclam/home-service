package com.homeservice.catalog.repository;

import com.homeservice.catalog.entity.ServiceOffering;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, Long> {
    List<ServiceOffering> findByProviderAccountId(Long providerId);
    Optional<ServiceOffering> findByIdAndProviderAccountId(Long id, Long providerId);

    @Query("SELECT s FROM ServiceOffering s " +
           "JOIN FETCH s.provider p " +
           "JOIN FETCH p.account a " +
           "JOIN FETCH s.category c " +
           "WHERE s.id = :id")
    Optional<ServiceOffering> findByIdWithDetails(@Param("id") Long id);
}
