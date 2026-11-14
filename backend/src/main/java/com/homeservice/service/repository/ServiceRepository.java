package com.homeservice.service.repository;

import com.homeservice.catalog.entity.ServiceOffering;
import com.homeservice.catalog.enums.ServiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ServiceRepository extends JpaRepository<ServiceOffering, Long>, JpaSpecificationExecutor<ServiceOffering> {

    // Danh sách dịch vụ của một NCC (có phân trang)
    Page<ServiceOffering> findByProviderAccountId(Long providerId, Pageable pageable);

    // Danh sách dịch vụ của NCC, lọc theo trạng thái
    Page<ServiceOffering> findByProviderAccountIdAndStatus(Long providerId, ServiceStatus status, Pageable pageable);

    // Lấy 1 dịch vụ chỉ khi đúng là của NCC đó (chống sửa dịch vụ của người khác)
    Optional<ServiceOffering> findByIdAndProviderAccountId(Long id, Long providerId);

    // Tìm kiếm theo Specification; nạp sẵn NCC và danh mục để khỏi truy vấn lặp từng dòng
    @Override
    @EntityGraph(attributePaths = {"provider", "category"})
    Page<ServiceOffering> findAll(Specification<ServiceOffering> spec, Pageable pageable);
}