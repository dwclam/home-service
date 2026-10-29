package com.homeservice.catalog.repository;

import com.homeservice.catalog.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    boolean existsByParentIdAndActiveTrue(Long parentId);

    List<Category> findAllByOrderBySortOrderAscNameAsc();

    boolean existsByParentId(Long parentId);

    List<Category> findByActiveTrueOrderBySortOrderAscNameAsc();
}