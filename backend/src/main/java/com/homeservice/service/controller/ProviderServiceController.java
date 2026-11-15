package com.homeservice.service.controller;

import com.homeservice.security.CurrentAccount;
import com.homeservice.service.dto.CreateServiceRequest;
import com.homeservice.service.dto.ServiceResponse;
import com.homeservice.service.dto.UpdateServiceRequest;
import com.homeservice.catalog.enums.ServiceStatus;
import com.homeservice.service.service.ServiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/provider/services")
@RequiredArgsConstructor
public class ProviderServiceController {

    private final ServiceService serviceService;

    // Tạo dịch vụ mới (luôn là DRAFT)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceResponse create(@AuthenticationPrincipal CurrentAccount me,
                                  @Valid @RequestBody CreateServiceRequest req) {
        return serviceService.create(me.getId(), req);
    }

    // Sửa dịch vụ của mình
    @PutMapping("/{id}")
    public ServiceResponse update(@AuthenticationPrincipal CurrentAccount me,
                                  @PathVariable Long id,
                                  @Valid @RequestBody UpdateServiceRequest req) {
        return serviceService.update(me.getId(), id, req);
    }

    // Xem chi tiết 1 dịch vụ của mình
    @GetMapping("/{id}")
    public ServiceResponse getOne(@AuthenticationPrincipal CurrentAccount me,
                                  @PathVariable Long id) {
        return serviceService.getMine(me.getId(), id);
    }

    // Danh sách dịch vụ của mình: ?status=PUBLISHED&page=0&size=10
    @GetMapping
    public Page<ServiceResponse> list(@AuthenticationPrincipal CurrentAccount me,
                                      @RequestParam(required = false) ServiceStatus status,
                                      @PageableDefault(size = 10, sort = "createdAt",
                                              direction = Sort.Direction.DESC) Pageable pageable) {
        return serviceService.listMine(me.getId(), status, pageable);
    }

    // Công khai dịch vụ
    @PatchMapping("/{id}/publish")
    public ServiceResponse publish(@AuthenticationPrincipal CurrentAccount me,
                                   @PathVariable Long id) {
        return serviceService.changeStatus(me.getId(), id, ServiceStatus.PUBLISHED);
    }

    // Lưu trữ dịch vụ (ẩn khỏi khách, không xóa)
    @PatchMapping("/{id}/archive")
    public ServiceResponse archive(@AuthenticationPrincipal CurrentAccount me,
                                   @PathVariable Long id) {
        return serviceService.changeStatus(me.getId(), id, ServiceStatus.ARCHIVED);
    }
}
