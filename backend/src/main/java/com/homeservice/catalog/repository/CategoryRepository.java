package com.homeservice.catalog.repository;

import com.homeservice.catalog.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    @Query("SELECT COUNT(c) > 0 FROM Category c WHERE c.parent.id = :parentId AND c.isActive = true")
    boolean existsByParentIdAndActiveTrue(@Param("parentId") Long parentId);

    List<Category> findAllByOrderBySortOrderAscNameAsc();

    boolean existsByParentId(Long parentId);

    @Query("SELECT c FROM Category c WHERE c.isActive = true ORDER BY c.sortOrder ASC, c.name ASC")
    List<Category> findByActiveTrueOrderBySortOrderAscNameAsc();
}
