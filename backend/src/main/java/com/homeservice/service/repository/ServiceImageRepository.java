package com.homeservice.service.repository;

import com.homeservice.catalog.entity.ServiceImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceImageRepository extends JpaRepository<ServiceImage, Long> {

    // Ảnh của một dịch vụ, xếp theo thứ tự hiển thị (nhỏ nhất đứng đầu)
    List<ServiceImage> findByServiceIdOrderBySortOrderAsc(Long serviceId);
}
