package com.homeservice.service.repository;

import com.homeservice.catalog.entity.ServiceImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceImageRepository extends JpaRepository<ServiceImage, Long> {

    // Ảnh của một dịch vụ, xếp theo thứ tự hiển thị (nhỏ nhất đứng đầu)
    List<ServiceImage> findByServiceIdOrderBySortOrderAsc(Long serviceId);

    // Một ảnh, chỉ khi đúng thuộc dịch vụ này (chống xóa ảnh của dịch vụ khác)
    Optional<ServiceImage> findByIdAndServiceId(Long id, Long serviceId);

    // Số ảnh hiện có của dịch vụ (để chặn quá giới hạn)
    long countByServiceId(Long serviceId);

    // Ảnh có thứ tự lớn nhất của dịch vụ (để ảnh mới nằm cuối)
    Optional<ServiceImage> findFirstByServiceIdOrderBySortOrderDesc(Long serviceId);
}
