package com.homeservice.catalog.controller;

import com.homeservice.catalog.dto.response.CategoryTreeResponse;
import com.homeservice.catalog.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/categories")
@RequiredArgsConstructor
public class CategoryPublicController {

    private final CategoryService categoryService;

    @GetMapping("/tree")
    public List<CategoryTreeResponse> tree() {
        return categoryService.getPublicTree();
    }
}