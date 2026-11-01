package com.homeservice.catalog.mapper;

import com.homeservice.catalog.dto.response.CategoryResponse;
import com.homeservice.catalog.entity.Category;
import org.springframework.stereotype.Component;

@Component
public class CategoryMapper {

    public CategoryResponse toResponse(Category c) {
        return new CategoryResponse(
                c.getId(),
                c.getName(),
                c.getSlug(),
                c.getDescription(),
                c.getIconName(),
                c.getSortOrder(),
                c.isActive(),
                c.getParent() != null ? c.getParent().getId() : null
        );
    }
}