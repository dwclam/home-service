package com.homeservice.support.repository;

import com.homeservice.support.entity.Complaint;
import com.homeservice.support.enums.ComplaintCategory;
import com.homeservice.support.enums.ComplaintStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long>, JpaSpecificationExecutor<Complaint> {

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
