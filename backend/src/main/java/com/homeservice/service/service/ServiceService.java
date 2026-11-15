package com.homeservice.service.service;

import com.homeservice.catalog.entity.Category;
import com.homeservice.catalog.repository.CategoryRepository;
import com.homeservice.common.exception.BusinessException;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.provider.entity.ProviderProfile;
import com.homeservice.provider.repository.ProviderProfileRepository;
import com.homeservice.service.dto.CreateServiceRequest;
import com.homeservice.service.dto.ServiceResponse;
import com.homeservice.service.dto.UpdateServiceRequest;
import com.homeservice.catalog.entity.ServiceOffering;
import com.homeservice.catalog.enums.ServiceStatus;
import com.homeservice.service.mapper.ServiceMapper;
import com.homeservice.service.repository.ServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

// Dùng tên đầy đủ vì entity của ta cũng tên là Service
@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class ServiceService {

    private final ServiceRepository serviceRepository;
    private final CategoryRepository categoryRepository;
    private final ProviderProfileRepository providerProfileRepository;
    private final ServiceMapper serviceMapper;

    // Tạo dịch vụ mới (luôn là DRAFT)
    @Transactional
    public ServiceResponse create(Long providerId, CreateServiceRequest req) {
        ProviderProfile provider = providerProfileRepository.findById(providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ nhà cung cấp"));
        Category category = getActiveCategory(req.getCategoryId());

        ServiceOffering saved = serviceRepository.save(serviceMapper.toEntity(req, provider, category));
        return serviceMapper.toResponse(saved);
    }

    // Sửa dịch vụ của chính NCC
    @Transactional
    public ServiceResponse update(Long providerId, Long id, UpdateServiceRequest req) {
        ServiceOffering s = getOwned(providerId, id);

        // Chỉ bắt buộc danh mục đang bật khi NCC đổi sang danh mục khác
        Category category = s.getCategory();
        if (!category.getId().equals(req.getCategoryId())) {
            category = getActiveCategory(req.getCategoryId());
        }
        serviceMapper.applyUpdate(s, req, category);
        return serviceMapper.toResponse(serviceRepository.save(s));
    }

    // Xem chi tiết 1 dịch vụ của mình
    @Transactional(readOnly = true)
    public ServiceResponse getMine(Long providerId, Long id) {
        return serviceMapper.toResponse(getOwned(providerId, id));
    }

    // Danh sách dịch vụ của mình, lọc theo trạng thái nếu có
    @Transactional(readOnly = true)
    public Page<ServiceResponse> listMine(Long providerId, ServiceStatus status, Pageable pageable) {
        Page<ServiceOffering> page = (status == null)
                ? serviceRepository.findByProviderAccountId(providerId, pageable)
                : serviceRepository.findByProviderAccountIdAndStatus(providerId, status, pageable);
        return page.map(serviceMapper::toResponse);
    }

    // Đổi trạng thái: công khai hoặc lưu trữ (không cho quay về DRAFT)
    @Transactional
    public ServiceResponse changeStatus(Long providerId, Long id, ServiceStatus target) {
        ServiceOffering s = getOwned(providerId, id);

        if (target == ServiceStatus.DRAFT) {
            throw new BusinessException("Không thể chuyển dịch vụ về trạng thái nháp");
        }
        if (s.getStatus() == target) {
            throw new BusinessException("Dịch vụ đã ở trạng thái này");
        }
        // Công khai thì danh mục phải còn bật
        if (target == ServiceStatus.PUBLISHED && !isCategoryUsable(s.getCategory())) {
            throw new BusinessException("Danh mục (hoặc danh mục cha) đang bị tắt, không thể công khai dịch vụ");
        }
        s.setStatus(target);
        return serviceMapper.toResponse(serviceRepository.save(s));
    }

    // Lấy dịch vụ chỉ khi đúng là của NCC này, không thì coi như không tồn tại
    private ServiceOffering getOwned(Long providerId, Long id) {
        return serviceRepository.findByIdAndProviderAccountId(id, providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ"));
    }

    // Lấy danh mục và bắt buộc đang bật
    private Category getActiveCategory(Long categoryId) {
        Category c = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
        if (!isCategoryUsable(c)) {
            throw new BusinessException("Danh mục (hoặc danh mục cha) đang bị tắt");
        }
        return c;
    }

    // Danh mục dùng được khi chính nó và mọi danh mục cha phía trên đều đang bật
    private boolean isCategoryUsable(Category category) {
        for (Category c = category; c != null; c = c.getParent()) {
            if (!Boolean.TRUE.equals(c.getIsActive())) {
                return false;
            }
        }
        return true;
    }
}
