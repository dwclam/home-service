package com.homeservice.service.repository;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.catalog.entity.Category;
import com.homeservice.provider.entity.ProviderProfile;
import com.homeservice.service.dto.ServiceSearchRequest;
import com.homeservice.catalog.entity.ServiceOffering;
import com.homeservice.catalog.enums.ServiceStatus;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

// Ghép điều kiện truy vấn cho tìm kiếm dịch vụ của khách
public final class ServiceSpecifications {

    private ServiceSpecifications() {
    }

    public static Specification<ServiceOffering> forCustomerSearch(ServiceSearchRequest req) {
        return (root, query, cb) -> {
            // Nối bảng NCC, tài khoản NCC, danh mục và danh mục cha
            Join<ServiceOffering, ProviderProfile> provider = root.join("provider");
            Join<ProviderProfile, Account> account = provider.join("account");
            Join<ServiceOffering, Category> category = root.join("category");
            Join<Category, Category> parent = category.join("parent", JoinType.LEFT);

            List<Predicate> p = new ArrayList<>();

            // --- Điều kiện bắt buộc: khách chỉ thấy dịch vụ hợp lệ ---
            addVisibilityConditions(p, cb, root, provider, account, category, parent);

            // --- Bộ lọc tùy chọn ---
            if (hasText(req.getKeyword())) {
                String pattern = "%" + escapeLike(req.getKeyword().trim().toLowerCase()) + "%";
                // Tìm trong tên hoặc mô tả, không phân biệt hoa thường
                p.add(cb.or(
                        cb.like(cb.lower(root.<String>get("title")), pattern, '\\'),
                        cb.like(cb.lower(root.<String>get("description")), pattern, '\\')));
            }
            if (req.getCategoryId() != null) {
                if (req.getProviderId() != null) {
                    // Chỉ dịch vụ của NCC này
                    p.add(cb.equal(provider.get("accountId"), req.getProviderId()));
                }

                // Danh mục được chọn, hoặc danh mục con của nó
                p.add(cb.or(
                        cb.equal(category.get("id"), req.getCategoryId()),
                        cb.equal(parent.get("id"), req.getCategoryId())));
            }
            if (hasText(req.getCity())) {
                p.add(cb.equal(cb.lower(provider.<String>get("city")),
                        req.getCity().trim().toLowerCase()));
            }
            if (req.getMinPrice() != null) {
                p.add(cb.greaterThanOrEqualTo(root.<Long>get("basePriceVnd"), req.getMinPrice()));
            }
            if (req.getMaxPrice() != null) {
                p.add(cb.lessThanOrEqualTo(root.<Long>get("basePriceVnd"), req.getMaxPrice()));
            }

            return cb.and(p.toArray(new Predicate[0]));
        };
    }

    // Một dịch vụ cụ thể khách được phép xem (UC06): đúng id và thỏa mọi điều kiện bắt buộc
    public static Specification<ServiceOffering> visibleToCustomerById(Long id) {
        return (root, query, cb) -> {
            Join<ServiceOffering, ProviderProfile> provider = root.join("provider");
            Join<ProviderProfile, Account> account = provider.join("account");
            Join<ServiceOffering, Category> category = root.join("category");
            Join<Category, Category> parent = category.join("parent", JoinType.LEFT);

            List<Predicate> p = new ArrayList<>();
            p.add(cb.equal(root.get("id"), id));
            addVisibilityConditions(p, cb, root, provider, account, category, parent);
            return cb.and(p.toArray(new Predicate[0]));
        };
    }

    // Các điều kiện bắt buộc dùng chung cho tìm kiếm (UC05) và xem chi tiết (UC06)
    private static void addVisibilityConditions(List<Predicate> p, CriteriaBuilder cb,
                                                Root<ServiceOffering> root,
                                                Join<ServiceOffering, ProviderProfile> provider,
                                                Join<ProviderProfile, Account> account,
                                                Join<ServiceOffering, Category> category,
                                                Join<Category, Category> parent) {
        p.add(cb.equal(root.get("status"), ServiceStatus.PUBLISHED));
        p.add(cb.equal(account.get("status"), AccountStatus.ACTIVE));
        p.add(cb.isFalse(account.<Boolean>get("mustChangePassword")));
        p.add(cb.isTrue(provider.<Boolean>get("isVisible")));
        p.add(cb.isTrue(category.<Boolean>get("isActive")));
        // Không có cha, hoặc cha đang bật
        p.add(cb.or(cb.isNull(parent.get("id")),
                cb.isTrue(parent.<Boolean>get("isActive"))));
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    // Khách gõ % hoặc _ thì coi là ký tự thường, không phải ký tự đại diện của LIKE
    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
