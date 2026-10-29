package com.homeservice.catalog.controller;

import java.util.List;
import com.homeservice.catalog.dto.request.CreateCategoryRequest;
import com.homeservice.catalog.dto.request.UpdateCategoryRequest;
import com.homeservice.catalog.dto.response.CategoryResponse;
import com.homeservice.catalog.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;



@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
public class CategoryAdminController {

    private final CategoryService categoryService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse create(@Valid @RequestBody CreateCategoryRequest req) {
        return categoryService.create(req);
    }

    @GetMapping("/{id}")
    public CategoryResponse getById(@PathVariable Long id) {
        return categoryService.getById(id);
    }

    @GetMapping
    public List<CategoryResponse> getAll() {
        return categoryService.getAll();
    }

    @PutMapping("/{id}")
    public CategoryResponse update(@PathVariable Long id,
                                   @Valid @RequestBody UpdateCategoryRequest req) {
        return categoryService.update(id, req);
    }

    @PatchMapping("/{id}/active")
    public CategoryResponse setActive(@PathVariable Long id, @RequestParam boolean value) {
        return categoryService.setActive(id, value);
    }
}