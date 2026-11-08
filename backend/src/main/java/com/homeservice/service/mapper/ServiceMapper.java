package com.homeservice.service.mapper;

import com.homeservice.catalog.entity.Category;
import com.homeservice.provider.entity.ProviderProfile;
import com.homeservice.service.dto.CreateServiceRequest;
import com.homeservice.service.dto.ServiceResponse;
import com.homeservice.service.dto.UpdateServiceRequest;
import com.homeservice.service.dto.ServiceSummaryResponse;
import com.homeservice.catalog.entity.ServiceOffering;
import com.homeservice.service.dto.ServiceDetailResponse;
import com.homeservice.service.dto.ServiceImageResponse;
import com.homeservice.catalog.entity.ServiceImage;
import com.homeservice.catalog.enums.ServiceStatus;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class ServiceMapper {

    // Request tạo mới -> entity (NCC và danh mục do service truyền vào)
    public ServiceOffering toEntity(CreateServiceRequest req, ProviderProfile provider, Category category) {
        ServiceOffering s = new ServiceOffering();
        s.setProvider(provider);
        s.setCategory(category);
        s.setTitle(req.getTitle().trim());
        s.setDescription(req.getDescription());
        s.setBasePriceVnd(req.getBasePriceVnd());
        s.setDurationMinutes(req.getDurationMinutes());
        s.setStatus(ServiceStatus.DRAFT); // dịch vụ mới luôn là nháp
        return s;
    }

    // Ghi dữ liệu sửa lên entity đã có (không đụng tới status và provider)
    public void applyUpdate(ServiceOffering s, UpdateServiceRequest req, Category category) {
        s.setCategory(category);
        s.setTitle(req.getTitle().trim());
        s.setDescription(req.getDescription());
        s.setBasePriceVnd(req.getBasePriceVnd());
        s.setDurationMinutes(req.getDurationMinutes());
    }

    // Entity -> response trả về cho client
    public ServiceResponse toResponse(ServiceOffering s) {
        ServiceResponse r = new ServiceResponse();
        r.setId(s.getId());
        r.setProviderId(s.getProvider().getAccountId());
        r.setCategoryId(s.getCategory().getId());
        r.setCategoryName(s.getCategory().getName());
        r.setTitle(s.getTitle());
        r.setDescription(s.getDescription());
        r.setBasePriceVnd(s.getBasePriceVnd());
        r.setDurationMinutes(s.getDurationMinutes());
        r.setStatus(s.getStatus());
        r.setCreatedAt(s.getCreatedAt());
        r.setUpdatedAt(s.getUpdatedAt());
        return r;
    }

    // Entity -> dữ liệu tóm tắt trong danh sách tìm kiếm của khách
    public ServiceSummaryResponse toSummary(ServiceOffering s) {
        ServiceSummaryResponse r = new ServiceSummaryResponse();
        r.setId(s.getId());
        r.setTitle(s.getTitle());
        r.setBasePriceVnd(s.getBasePriceVnd());
        r.setDurationMinutes(s.getDurationMinutes());
        r.setCategoryId(s.getCategory().getId());
        r.setCategoryName(s.getCategory().getName());
        // Chỉ lấy thông tin công khai của NCC
        r.setProviderId(s.getProvider().getAccountId());
        r.setProviderName(s.getProvider().getBusinessName());
        r.setProviderCity(s.getProvider().getCity());
        r.setCreatedAt(s.getCreatedAt());
        return r;
    }

    // Entity + danh sách ảnh -> dữ liệu chi tiết cho khách (UC06)
    public ServiceDetailResponse toDetail(ServiceOffering s, List<ServiceImage> images) {
        ServiceDetailResponse r = new ServiceDetailResponse();
        r.setId(s.getId());
        r.setTitle(s.getTitle());
        r.setDescription(s.getDescription());
        r.setBasePriceVnd(s.getBasePriceVnd());
        r.setDurationMinutes(s.getDurationMinutes());
        r.setCategoryId(s.getCategory().getId());
        r.setCategoryName(s.getCategory().getName());
        r.setImages(images.stream().map(this::toImageResponse).toList());
        // Chỉ lấy thông tin công khai của NCC
        r.setProviderId(s.getProvider().getAccountId());
        r.setProviderName(s.getProvider().getBusinessName());
        r.setProviderCity(s.getProvider().getCity());
        r.setProviderBio(s.getProvider().getBio());
        r.setProviderLogoUrl(s.getProvider().getLogoUrl());
        return r;
    }

    // Một ảnh -> response
    private ServiceImageResponse toImageResponse(ServiceImage img) {
        ServiceImageResponse r = new ServiceImageResponse();
        r.setId(img.getId());
        r.setImageUrl(img.getImageUrl());
        r.setAltText(img.getAltText());
        r.setSortOrder(img.getSortOrder());
        return r;
    }
}
