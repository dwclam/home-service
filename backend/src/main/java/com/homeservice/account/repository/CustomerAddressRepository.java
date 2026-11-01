package com.homeservice.account.repository;

import com.homeservice.account.entity.CustomerAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerAddressRepository extends JpaRepository<CustomerAddress, Long> {
    List<CustomerAddress> findByCustomerIdAndArchivedAtIsNull(Long customerId);
    Optional<CustomerAddress> findByIdAndCustomerId(Long id, Long customerId);
}
