package com.homeservice.support.repository.specification;

import com.homeservice.support.dto.request.CustomerComplaintFilter;
import com.homeservice.support.entity.Complaint;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * JPA Specification hỗ trợ lọc động danh sách khiếu nại (UC 39 & UC 33).
 */
public class ComplaintSpecification {

    private ComplaintSpecification() {
        // Utility class
    }

    public static Specification<Complaint> forCustomer(Long customerId, CustomerComplaintFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            // Ràng buộc cứng chống IDOR: chỉ truy vấn khiếu nại thuộc chính customerId
            predicates.add(cb.equal(root.get("customer").get("id"), customerId));

            if (filter != null) {
                if (filter.getStatus() != null) {
                    predicates.add(cb.equal(root.get("status"), filter.getStatus()));
                }
                if (filter.getCategory() != null) {
                    predicates.add(cb.equal(root.get("category"), filter.getCategory()));
                }
                if (filter.getBookingId() != null) {
                    predicates.add(cb.equal(root.get("booking").get("id"), filter.getBookingId()));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
