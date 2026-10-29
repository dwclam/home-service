package com.homeservice.catalog.dto.response;

import java.util.List;

public record CategoryTreeResponse(
        Long id,
        String name,
        String slug,
        String iconName,
        List<CategoryTreeResponse> children
) {}