package com.homeservice.catalog.repository;

import com.homeservice.catalog.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findBySlug(String slug);
}

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    boolean existsByParentIdAndActiveTrue(Long parentId);

    List<Category> findAllByOrderBySortOrderAscNameAsc();

    boolean existsByParentId(Long parentId);

    List<Category> findByActiveTrueOrderBySortOrderAscNameAsc();
}