package com.homeservice.service.service;

import com.homeservice.catalog.entity.ServiceImage;
import com.homeservice.catalog.entity.ServiceOffering;
import com.homeservice.common.exception.BusinessException;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.provider.service.ProviderAccountGuard;
import com.homeservice.service.dto.AddServiceImageRequest;
import com.homeservice.service.dto.ReorderServiceImagesRequest;
import com.homeservice.service.dto.ServiceImageResponse;
import com.homeservice.service.mapper.ServiceMapper;
import com.homeservice.service.repository.ServiceImageRepository;
import com.homeservice.service.repository.ServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

// UC19: NCC quản lý ảnh của dịch vụ của mình
@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class ServiceImageService {

    // Giới hạn số ảnh mỗi dịch vụ
    private static final int MAX_IMAGES_PER_SERVICE = 10;

    private final ServiceRepository serviceRepository;
    private final ServiceImageRepository serviceImageRepository;
    private final ServiceMapper serviceMapper;
    private final ProviderAccountGuard providerAccountGuard;

    // Danh sách ảnh của dịch vụ (NCC cần id ảnh để xóa và đổi thứ tự)
    @Transactional(readOnly = true)
    public List<ServiceImageResponse> list(Long providerId, Long serviceId) {
        providerAccountGuard.requireActive(providerId);
        getOwnedService(providerId, serviceId);
        return serviceImageRepository.findByServiceIdOrderBySortOrderAsc(serviceId).stream()
                .map(serviceMapper::toImageResponse)
                .toList();
    }

    // Thêm ảnh vào cuối danh sách
    @Transactional
    public ServiceImageResponse add(Long providerId, Long serviceId, AddServiceImageRequest req) {
        providerAccountGuard.requireActive(providerId);
        ServiceOffering service = getOwnedService(providerId, serviceId);

        if (serviceImageRepository.countByServiceId(serviceId) >= MAX_IMAGES_PER_SERVICE) {
            throw new BusinessException("Mỗi dịch vụ tối đa " + MAX_IMAGES_PER_SERVICE + " ảnh");
        }

        // Thứ tự mới = thứ tự lớn nhất hiện có + 1 (chưa có ảnh thì bắt đầu từ 0)
        int nextOrder = serviceImageRepository.findFirstByServiceIdOrderBySortOrderDesc(serviceId)
                .map(last -> last.getSortOrder() + 1)
                .orElse(0);

        ServiceImage image = new ServiceImage();
        image.setService(service);
        image.setImageUrl(req.getImageUrl().trim());
        image.setAltText(req.getAltText() != null && !req.getAltText().isBlank()
                ? req.getAltText().trim() : null);
        image.setSortOrder(nextOrder);

        return serviceMapper.toImageResponse(serviceImageRepository.save(image));
    }

    // Xóa một ảnh (chỉ ảnh thuộc dịch vụ của mình)
    @Transactional
    public void delete(Long providerId, Long serviceId, Long imageId) {
        providerAccountGuard.requireActive(providerId);
        getOwnedService(providerId, serviceId);

        ServiceImage image = serviceImageRepository.findByIdAndServiceId(imageId, serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ảnh"));
        serviceImageRepository.delete(image);
    }

    // Đổi thứ tự: nhận danh sách id ảnh theo thứ tự mới
    @Transactional
    public List<ServiceImageResponse> reorder(Long providerId, Long serviceId, ReorderServiceImagesRequest req) {
        providerAccountGuard.requireActive(providerId);
        getOwnedService(providerId, serviceId);

        List<ServiceImage> images = serviceImageRepository.findByServiceIdOrderBySortOrderAsc(serviceId);
        List<Long> requested = req.getImageIds();

        // Phải gửi đúng tập ảnh hiện có: đủ, không trùng, không thừa
        Set<Long> currentIds = images.stream().map(ServiceImage::getId).collect(Collectors.toSet());
        if (requested.size() != currentIds.size() || !currentIds.equals(new HashSet<>(requested))) {
            throw new BusinessException(
                    "Danh sách ảnh phải gồm đúng các ảnh hiện có của dịch vụ, mỗi ảnh một lần");
        }

        // Gán lại thứ tự theo vị trí trong danh sách gửi lên (0, 1, 2...)
        Map<Long, ServiceImage> byId = images.stream()
                .collect(Collectors.toMap(ServiceImage::getId, i -> i));
        for (int i = 0; i < requested.size(); i++) {
            byId.get(requested.get(i)).setSortOrder(i);
        }
        serviceImageRepository.saveAll(images);

        return requested.stream().map(id -> serviceMapper.toImageResponse(byId.get(id))).toList();
    }

    // Lấy dịch vụ chỉ khi đúng là của NCC này, không thì coi như không tồn tại (404)
    private ServiceOffering getOwnedService(Long providerId, Long serviceId) {
        return serviceRepository.findByIdAndProviderAccountId(serviceId, providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ"));
    }
}
