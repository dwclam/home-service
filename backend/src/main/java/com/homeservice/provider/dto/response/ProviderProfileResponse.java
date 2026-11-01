package com.homeservice.provider.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

// Tuyệt đối không thêm dữ liệu ngân hàng hay hồ sơ xét duyệt vào đây
@Getter
@AllArgsConstructor // thứ tự tham số = thứ tự field khai báo bên dưới
public class ProviderProfileResponse {

    private Long accountId;
    private String businessName;
    private String bio;
    private String city;
    private String address;
    private String logoUrl;
    private boolean visible;
}