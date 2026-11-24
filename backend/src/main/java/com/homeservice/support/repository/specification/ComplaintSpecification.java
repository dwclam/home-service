package com.homeservice.support.repository.specification;

import com.homeservice.booking.entity.Booking;
import com.homeservice.support.dto.request.AdminComplaintSearchFilter;
import com.homeservice.support.dto.request.CustomerComplaintFilter;
import com.homeservice.support.entity.Complaint;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
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

    public static Specification<Complaint> forAdmin(AdminComplaintSearchFilter filter) {
        return (root, query, cb) -> {
            if (filter == null) {
                return cb.conjunction();
            }

            List<Predicate> predicates = new ArrayList<>();

            if (filter.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), filter.getStatus()));
            }
            if (filter.getCategory() != null) {
                predicates.add(cb.equal(root.get("category"), filter.getCategory()));
            }
            if (Boolean.TRUE.equals(filter.getUnassignedOnly())) {
                predicates.add(cb.isNull(root.get("assignedAdmin")));
            } else if (filter.getAssignedAdminId() != null) {
                predicates.add(cb.equal(root.get("assignedAdmin").get("id"), filter.getAssignedAdminId()));
            }
            if (filter.getCustomerId() != null) {
                predicates.add(cb.equal(root.get("customer").get("id"), filter.getCustomerId()));
            }
            if (filter.getBookingId() != null) {
                predicates.add(cb.equal(root.get("booking").get("id"), filter.getBookingId()));
            }
            if (filter.getKeyword() != null && !filter.getKeyword().trim().isEmpty()) {
                String pattern = "%" + filter.getKeyword().trim().toLowerCase() + "%";
                // Dùng LEFT JOIN để không bỏ sót khiếu nại hỗ trợ chung (booking IS NULL) khi tìm theo subject
                Join<Complaint, Booking> bookingJoin = root.join("booking", JoinType.LEFT);
                Predicate matchSubject = cb.like(cb.lower(root.get("subject")), pattern);
                Predicate matchBookingCode = cb.like(cb.lower(bookingJoin.get("bookingCode")), pattern);
                predicates.add(cb.or(matchSubject, matchBookingCode));
            }
            if (filter.getFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), filter.getFrom()));
            }
            if (filter.getTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), filter.getTo()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
