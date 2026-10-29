package com.homeservice.catalog.dto.response;

public record CategoryResponse(
        Long id,
        String name,
        String slug,
        String description,
        String iconName,
        int sortOrder,
        boolean active,
        Long parentId
) {}