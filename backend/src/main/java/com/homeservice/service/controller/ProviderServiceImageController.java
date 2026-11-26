package com.homeservice.service.controller;

import com.homeservice.security.CurrentAccount;
import com.homeservice.service.dto.AddServiceImageRequest;
import com.homeservice.service.dto.ReorderServiceImagesRequest;
import com.homeservice.service.dto.ServiceImageResponse;
import com.homeservice.service.service.ServiceImageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// UC19: NCC quản lý ảnh của dịch vụ của mình
@RestController
@RequestMapping("/api/provider/services/{serviceId}/images")
@RequiredArgsConstructor
public class ProviderServiceImageController {

    private final ServiceImageService serviceImageService;

    // Danh sách ảnh của dịch vụ (kèm id để xóa hoặc đổi thứ tự)
    @GetMapping
    public List<ServiceImageResponse> list(@AuthenticationPrincipal CurrentAccount me,
                                           @PathVariable Long serviceId) {
        return serviceImageService.list(me.getId(), serviceId);
    }

    // Thêm một ảnh vào cuối danh sách
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceImageResponse add(@AuthenticationPrincipal CurrentAccount me,
                                    @PathVariable Long serviceId,
                                    @Valid @RequestBody AddServiceImageRequest req) {
        return serviceImageService.add(me.getId(), serviceId, req);
    }

    // Xóa một ảnh
    @DeleteMapping("/{imageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal CurrentAccount me,
                       @PathVariable Long serviceId,
                       @PathVariable Long imageId) {
        serviceImageService.delete(me.getId(), serviceId, imageId);
    }

    // Đổi thứ tự: gửi danh sách id ảnh theo thứ tự mới
    @PutMapping("/order")
    public List<ServiceImageResponse> reorder(@AuthenticationPrincipal CurrentAccount me,
                                              @PathVariable Long serviceId,
                                              @Valid @RequestBody ReorderServiceImagesRequest req) {
        return serviceImageService.reorder(me.getId(), serviceId, req);
    }
}
