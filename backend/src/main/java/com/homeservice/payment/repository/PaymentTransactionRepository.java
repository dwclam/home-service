package com.homeservice.payment.repository;

import com.homeservice.payment.entity.PaymentTransaction;
import com.homeservice.payment.enums.PaymentKind;
import com.homeservice.payment.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    List<PaymentTransaction> findByBookingId(Long bookingId);

    Optional<PaymentTransaction> findFirstByBookingIdAndKindAndStatusOrderByCreatedAtDesc(
            Long bookingId,
            PaymentKind kind,
            PaymentStatus status
    );
}
