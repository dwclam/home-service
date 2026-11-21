package com.homeservice.support.repository;

import com.homeservice.support.entity.Complaint;
import com.homeservice.support.enums.ComplaintCategory;
import com.homeservice.support.enums.ComplaintStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long>, JpaSpecificationExecutor<Complaint> {

    @Override
    @EntityGraph(attributePaths = {"customer", "booking", "assignedAdmin"})
    Page<Complaint> findAll(@Nullable Specification<Complaint> spec, Pageable pageable);

    @Query("SELECT c FROM Complaint c " +
           "LEFT JOIN FETCH c.customer " +
           "LEFT JOIN FETCH c.booking " +
           "LEFT JOIN FETCH c.assignedAdmin " +
           "WHERE c.id = :id")
    Optional<Complaint> findByIdWithDetails(@Param("id") Long id);

    /**
     * Kiểm tra khách hàng đã có khiếu nại chưa kết thúc cùng danh mục trên cùng đơn hàng hay chưa (chống spam trùng).
     */
    boolean existsByCustomerIdAndBookingIdAndCategoryAndStatusIn(
            Long customerId,
            Long bookingId,
            ComplaintCategory category,
            Collection<ComplaintStatus> statuses
    );

    /**
     * Phục vụ MD10 / UC48: Kiểm tra đơn đặt lịch có khiếu nại chưa kết thúc (OPEN / IN_REVIEW) hay không.
     */
    boolean existsByBookingIdAndStatusIn(Long bookingId, Collection<ComplaintStatus> statuses);

    /**
     * Đếm số khiếu nại chưa kết thúc gắn với đơn đặt lịch.
     */
    long countByBookingIdAndStatusIn(Long bookingId, Collection<ComplaintStatus> statuses);
}
