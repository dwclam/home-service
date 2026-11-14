package com.homeservice.booking.repository.specification;

import com.homeservice.booking.dto.request.AdminBookingSearchFilter;
import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.enums.DateFilterType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * JPA Specification hỗ trợ truy vấn lọc động cho đơn đặt lịch (UC 31).
 */
public class BookingSpecification {

    private BookingSpecification() {
        // Utility class
    }

    public static Specification<Booking> withFilter(AdminBookingSearchFilter filter) {
        return (root, query, cb) -> {
            if (filter == null) {
                return cb.conjunction();
            }

            List<Predicate> predicates = new ArrayList<>();

            if (filter.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), filter.getStatus()));
            }

            if (filter.getSettlementStatus() != null) {
                predicates.add(cb.equal(root.get("settlementStatus"), filter.getSettlementStatus()));
            }

            if (filter.getCustomerId() != null) {
                predicates.add(cb.equal(root.get("customer").get("id"), filter.getCustomerId()));
            }

            if (filter.getProviderId() != null) {
                predicates.add(cb.equal(root.get("provider").get("accountId"), filter.getProviderId()));
            }

            if (filter.getServiceId() != null) {
                predicates.add(cb.equal(root.get("service").get("id"), filter.getServiceId()));
            }

            if (filter.getBookingCode() != null && !filter.getBookingCode().trim().isEmpty()) {
                String pattern = "%" + filter.getBookingCode().trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get("bookingCode")), pattern));
            }

            String dateField = (filter.getDateFilterType() == DateFilterType.STARTS_AT) ? "startsAt" : "createdAt";

            if (filter.getFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get(dateField), filter.getFrom()));
            }

            if (filter.getTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get(dateField), filter.getTo()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
