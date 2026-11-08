package com.homeservice.catalog.service;

import com.homeservice.catalog.entity.Category;
import com.homeservice.catalog.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CategorySeeder implements CommandLineRunner {

    private final CategoryRepository categoryRepository;

    @Override
    public void run(String... args) {
        if (categoryRepository.count() > 0) {
            return; // đã có dữ liệu thì không chèn nữa
        }
        Category cleaning = save(null, "Vệ sinh nhà cửa", "ve-sinh-nha-cua", 1);
        save(cleaning, "Dọn dẹp theo giờ", "don-dep-theo-gio", 1);
        save(cleaning, "Tổng vệ sinh", "tong-ve-sinh", 2);

        Category repair = save(null, "Sửa chữa điện nước", "sua-chua-dien-nuoc", 2);
        save(repair, "Sửa điện", "sua-dien", 1);
        save(repair, "Sửa nước", "sua-nuoc", 2);
    }

    private Category save(Category parent, String name, String slug, int sortOrder) {
        Category c = new Category();
        c.setParent(parent);
        c.setName(name);
        c.setSlug(slug);
        c.setSortOrder(sortOrder);
        return categoryRepository.save(c);
    }
}