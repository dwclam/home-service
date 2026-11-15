package com.homeservice.catalog.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CategoryResponse {

    private Long id;
    private String name;
    private String slug;
    private String description;
    private String iconName;
    private int sortOrder;
    private boolean active;
    private Long parentId;
}