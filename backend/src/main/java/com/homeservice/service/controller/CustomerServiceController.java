package com.homeservice.service.controller;

import com.homeservice.common.dto.PageResponse;
import com.homeservice.service.dto.ServiceSearchRequest;
import com.homeservice.service.dto.ServiceSummaryResponse;
import com.homeservice.service.service.ServiceSearchService;
import com.homeservice.service.dto.ServiceDetailResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;


@RestController
@RequestMapping("/api/customer/services")
@RequiredArgsConstructor
public class CustomerServiceController {

    private final ServiceSearchService serviceSearchService;

    // UC05: tìm kiếm, lọc dịch vụ
    // Ví dụ: /api/customer/services?keyword=ve sinh&city=Ha Noi&sort=PRICE_ASC&page=0&size=10
    @GetMapping
    public PageResponse<ServiceSummaryResponse> search(@Valid @ModelAttribute ServiceSearchRequest req) {
        return serviceSearchService.search(req);
    }

    // UC06: xem chi tiết một dịch vụ
    @GetMapping("/{id}")
    public ServiceDetailResponse getDetail(@PathVariable Long id) {
        return serviceSearchService.getDetail(id);
    }
}
