package com.homeservice.catalog.service;

import com.homeservice.catalog.dto.request.CreateCategoryRequest;
import com.homeservice.catalog.dto.request.UpdateCategoryRequest;
import com.homeservice.catalog.dto.response.CategoryResponse;
import com.homeservice.catalog.dto.response.CategoryTreeResponse;
import com.homeservice.catalog.entity.Category;
import com.homeservice.catalog.mapper.CategoryMapper;
import com.homeservice.catalog.repository.CategoryRepository;
import com.homeservice.common.exception.BusinessException;
import com.homeservice.common.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTests {

    @Mock
    private CategoryRepository categoryRepository;

    @Spy
    private CategoryMapper categoryMapper = new CategoryMapper();

    @InjectMocks
    private CategoryService categoryService;

    private Category parentCategory;
    private Category childCategory;

    @BeforeEach
    void setUp() {
        parentCategory = new Category();
        parentCategory.setId(1L);
        parentCategory.setName("Vệ sinh nhà cửa");
        parentCategory.setSlug("ve-sinh-nha-cua");
        parentCategory.setSortOrder(1);
        parentCategory.setActive(true);

        childCategory = new Category();
        childCategory.setId(2L);
        childCategory.setParent(parentCategory);
        childCategory.setName("Dọn dẹp theo giờ");
        childCategory.setSlug("don-dep-theo-gio");
        childCategory.setSortOrder(1);
        childCategory.setActive(true);
    }

    @Test
    @DisplayName("Tạo danh mục thành công khi slug chưa tồn tại")
    void create_Success() {
        CreateCategoryRequest req = new CreateCategoryRequest("Vệ sinh nhà cửa", "ve-sinh-nha-cua", "Mô tả", "clean-icon", 1, null);

        when(categoryRepository.existsBySlug("ve-sinh-nha-cua")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> {
            Category c = invocation.getArgument(0);
            c.setId(1L);
            return c;
        });

        CategoryResponse res = categoryService.create(req);

        assertThat(res).isNotNull();
        assertThat(res.id()).isEqualTo(1L);
        assertThat(res.name()).isEqualTo("Vệ sinh nhà cửa");
        assertThat(res.slug()).isEqualTo("ve-sinh-nha-cua");
        verify(categoryRepository).save(any(Category.class));
    }

    @Test
    @DisplayName("Tạo danh mục thất bại khi trùng slug")
    void create_DuplicateSlug_ThrowsBusinessException() {
        CreateCategoryRequest req = new CreateCategoryRequest("Vệ sinh nhà cửa", "ve-sinh-nha-cua", null, null, 1, null);

        when(categoryRepository.existsBySlug("ve-sinh-nha-cua")).thenReturn(true);

        assertThatThrownBy(() -> categoryService.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Slug đã tồn tại");

        verify(categoryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Cập nhật danh mục thành công")
    void update_Success() {
        UpdateCategoryRequest req = new UpdateCategoryRequest("Vệ sinh cao cấp", "ve-sinh-cao-cap", "Mô tả mới", "icon2", 2, null);

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(parentCategory));
        when(categoryRepository.existsBySlugAndIdNot("ve-sinh-cao-cap", 1L)).thenReturn(false);

        CategoryResponse res = categoryService.update(1L, req);

        assertThat(res.name()).isEqualTo("Vệ sinh cao cấp");
        assertThat(res.slug()).isEqualTo("ve-sinh-cao-cap");
    }

    @Test
    @DisplayName("Cập nhật danh mục phát hiện vòng lặp cha con")
    void update_CycleDetection_ThrowsBusinessException() {
        // Cố gắng gán con làm cha của cha
        UpdateCategoryRequest req = new UpdateCategoryRequest("Vệ sinh nhà cửa", "ve-sinh-nha-cua", null, null, 1, 2L);

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(parentCategory));
        when(categoryRepository.existsBySlugAndIdNot("ve-sinh-nha-cua", 1L)).thenReturn(false);
        when(categoryRepository.findById(2L)).thenReturn(Optional.of(childCategory));

        assertThatThrownBy(() -> categoryService.update(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("vòng lặp");
    }

    @Test
    @DisplayName("Không cho tắt danh mục cha khi còn con đang bật")
    void setActive_DisableParentWithActiveChildren_ThrowsBusinessException() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(parentCategory));
        when(categoryRepository.existsByParentIdAndActiveTrue(1L)).thenReturn(true);

        assertThatThrownBy(() -> categoryService.setActive(1L, false))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Hãy tắt các danh mục con trước");
    }

    @Test
    @DisplayName("Lấy danh mục theo id không tồn tại ném ResourceNotFoundException")
    void getById_NotFound_ThrowsResourceNotFoundException() {
        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.getById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy danh mục");
    }

    @Test
    @DisplayName("Lấy cây danh mục public cấu trúc đúng cha - con")
    void getPublicTree_Success() {
        when(categoryRepository.findByActiveTrueOrderBySortOrderAscNameAsc())
                .thenReturn(List.of(parentCategory, childCategory));

        List<CategoryTreeResponse> tree = categoryService.getPublicTree();

        assertThat(tree).hasSize(1);
        assertThat(tree.get(0).id()).isEqualTo(1L);
        assertThat(tree.get(0).children()).hasSize(1);
        assertThat(tree.get(0).children().get(0).id()).isEqualTo(2L);
    }
}
