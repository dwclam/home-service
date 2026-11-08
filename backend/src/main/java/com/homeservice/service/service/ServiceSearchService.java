package com.homeservice.service.service;

import com.homeservice.common.dto.PageResponse;
import com.homeservice.common.exception.BusinessException;
import com.homeservice.service.dto.ServiceSearchRequest;
import com.homeservice.service.dto.ServiceSummaryResponse;
import com.homeservice.catalog.entity.ServiceOffering;
import com.homeservice.service.enums.ServiceSort;
import com.homeservice.service.mapper.ServiceMapper;
import com.homeservice.service.repository.ServiceRepository;
import com.homeservice.service.repository.ServiceSpecifications;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.service.dto.ServiceDetailResponse;
import com.homeservice.catalog.entity.ServiceImage;
import com.homeservice.service.repository.ServiceImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// Dùng tên đầy đủ vì entity của ta cũng tên là Service
@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class ServiceSearchService {

    private final ServiceRepository serviceRepository;
    private final ServiceMapper serviceMapper;
    private final ServiceImageRepository serviceImageRepository;

    // UC05: tìm kiếm, lọc dịch vụ công khai cho khách
    @Transactional(readOnly = true)
    public PageResponse<ServiceSummaryResponse> search(ServiceSearchRequest req) {
        // Khoảng giá phải hợp lệ
        if (req.getMinPrice() != null && req.getMaxPrice() != null
                && req.getMinPrice() > req.getMaxPrice()) {
            throw new BusinessException("Giá thấp nhất không được lớn hơn giá cao nhất");
        }

        Pageable pageable = PageRequest.of(req.getPage(), req.getSize(), toSort(req.getSort()));
        Page<ServiceOffering> page = serviceRepository.findAll(
                ServiceSpecifications.forCustomerSearch(req), pageable);

        // Đổi từng dịch vụ sang dạng tóm tắt
        List<ServiceSummaryResponse> items = page.getContent().stream()
                .map(serviceMapper::toSummary)
                .toList();

        return new PageResponse<>(items, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }



    // UC06: xem chi tiết một dịch vụ công khai
    @Transactional(readOnly = true)
    public ServiceDetailResponse getDetail(Long id) {
        // Dịch vụ không tồn tại hoặc không được phép xem đều trả cùng một lỗi 404
        ServiceOffering s = serviceRepository.findOne(ServiceSpecifications.visibleToCustomerById(id))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ"));

        // Ảnh đã xếp theo thứ tự hiển thị
        List<ServiceImage> images = serviceImageRepository.findByServiceIdOrderBySortOrderAsc(s.getId());
        return serviceMapper.toDetail(s, images);
    }

    // Đổi kiểu sắp xếp khách chọn thành Sort của Spring
    // Luôn thêm id làm tiêu chí phụ để thứ tự ổn định giữa các trang
    private Sort toSort(ServiceSort sort) {
        ServiceSort s = (sort == null) ? ServiceSort.NEWEST : sort;
        return switch (s) {
            case PRICE_ASC -> Sort.by(Sort.Order.asc("basePriceVnd"), Sort.Order.desc("id"));
            case PRICE_DESC -> Sort.by(Sort.Order.desc("basePriceVnd"), Sort.Order.desc("id"));
            case NEWEST -> Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
        };
    }


}
