package com.homeservice.catalog.repository;

import com.homeservice.catalog.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    // Có sẵn của nhóm
    Optional<Category> findBySlug(String slug);

    // ----- Các hàm của UC30 -----

    // Slug đã tồn tại chưa (khi tạo mới)
    boolean existsBySlug(String slug);

    // Slug đã bị danh mục khác dùng chưa (khi sửa, loại trừ chính nó)
    boolean existsBySlugAndIdNot(String slug, Long id);

    // Danh mục này còn danh mục con đang bật không
    boolean existsByParentIdAndIsActiveTrue(Long parentId);

    // Toàn bộ danh mục cho admin, xếp theo thứ tự rồi theo tên
    List<Category> findAllByOrderBySortOrderAscNameAsc();

    // Danh mục đang bật cho cây public, xếp theo thứ tự rồi theo tên
    List<Category> findByIsActiveTrueOrderBySortOrderAscNameAsc();
}
