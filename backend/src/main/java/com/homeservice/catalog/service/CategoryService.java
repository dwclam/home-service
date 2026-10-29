package com.homeservice.catalog.service;

import java.util.List;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import com.homeservice.catalog.dto.request.CreateCategoryRequest;
import com.homeservice.catalog.dto.response.CategoryResponse;
import com.homeservice.catalog.dto.response.CategoryTreeResponse;
import com.homeservice.catalog.entity.Category;
import com.homeservice.catalog.mapper.CategoryMapper;
import com.homeservice.catalog.repository.CategoryRepository;
import com.homeservice.common.exception.BusinessException;
import com.homeservice.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.homeservice.catalog.dto.request.UpdateCategoryRequest;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;

    @Transactional
    public CategoryResponse create(CreateCategoryRequest req) {
        if (categoryRepository.existsBySlug(req.slug())) {
            throw new BusinessException("Slug đã tồn tại");
        }

        Category category = new Category();
        category.setName(req.name());
        category.setSlug(req.slug());
        category.setDescription(req.description());
        category.setIconName(req.iconName());
        if (req.sortOrder() != null) {
            category.setSortOrder(req.sortOrder());
        }

        if (req.parentId() != null) {
            Category parent = categoryRepository.findById(req.parentId())
                    .orElseThrow(() -> new BusinessException("Danh mục cha không tồn tại"));
            category.setParent(parent);
        }

        return categoryMapper.toResponse(categoryRepository.save(category));
    }

    @Transactional(readOnly = true)
    public CategoryResponse getById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
        return categoryMapper.toResponse(category);
    }

    @Transactional
    public CategoryResponse update(Long id, UpdateCategoryRequest req) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));

        // Slug: chỉ báo trùng với danh mục KHÁC
        if (categoryRepository.existsBySlugAndIdNot(req.slug(), id)) {
            throw new BusinessException("Slug đã tồn tại");
        }

        category.setName(req.name());
        category.setSlug(req.slug());
        category.setDescription(req.description());
        category.setIconName(req.iconName());
        if (req.sortOrder() != null) {
            category.setSortOrder(req.sortOrder());
        }
        category.setParent(resolveParent(id, req.parentId()));

        return categoryMapper.toResponse(category); // @Transactional tự lưu thay đổi
    }

    @Transactional
    public CategoryResponse setActive(Long id, boolean active) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));

        // Phương án C: không cho tắt cha khi còn con đang bật
        if (!active && categoryRepository.existsByParentIdAndActiveTrue(id)) {
            throw new BusinessException("Hãy tắt các danh mục con trước");
        }
        // Không cho bật con khi cha đang tắt
        if (active && category.getParent() != null && !category.getParent().isActive()) {
            throw new BusinessException("Hãy bật danh mục cha trước");
        }

        category.setActive(active);
        return categoryMapper.toResponse(category);
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAll() {
        return categoryRepository.findAllByOrderBySortOrderAscNameAsc()
                .stream()
                .map(categoryMapper::toResponse)
                .toList();
    }

    // Tìm cha mới và chống vòng cha–con
    private Category resolveParent(Long selfId, Long parentId) {
        if (parentId == null) {
            return null;
        }
        if (parentId.equals(selfId)) {
            throw new BusinessException("Danh mục không thể là cha của chính nó");
        }
        Category parent = categoryRepository.findById(parentId)
                .orElseThrow(() -> new BusinessException("Danh mục cha không tồn tại"));

        // Đi ngược lên chuỗi tổ tiên của cha mới; gặp lại chính mình = vòng
        Category cursor = parent.getParent();
        while (cursor != null) {
            if (cursor.getId().equals(selfId)) {
                throw new BusinessException("Không thể gán danh mục con làm cha (tạo vòng lặp)");
            }
            cursor = cursor.getParent();
        }
        return parent;
    }

    @Transactional(readOnly = true)
    public List<CategoryTreeResponse> getPublicTree() {
        List<Category> actives = categoryRepository.findByActiveTrueOrderBySortOrderAscNameAsc();

        // Bước 1: tạo nút rỗng cho mỗi danh mục, tra theo id
        Map<Long, List<CategoryTreeResponse>> childrenOf = new LinkedHashMap<>();
        for (Category c : actives) {
            childrenOf.put(c.getId(), new ArrayList<>());
        }

        // Bước 2: tạo nút, gắn vào danh sách con của cha
        List<CategoryTreeResponse> roots = new ArrayList<>();
        for (Category c : actives) {
            CategoryTreeResponse node = new CategoryTreeResponse(
                    c.getId(), c.getName(), c.getSlug(), c.getIconName(),
                    childrenOf.get(c.getId()));
            Long parentId = c.getParent() != null ? c.getParent().getId() : null;
            if (parentId == null) {
                roots.add(node);
            } else if (childrenOf.containsKey(parentId)) {
                childrenOf.get(parentId).add(node);
            }
            // cha không nằm trong danh sách bật -> bỏ qua nút này
        }
        return roots;
    }
}