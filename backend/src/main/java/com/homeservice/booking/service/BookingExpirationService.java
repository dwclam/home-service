package com.homeservice.booking.service;

import com.homeservice.booking.dto.response.BookingExpirationResult;
import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.entity.BookingStatusHistory;
import com.homeservice.booking.enums.BookingStatus;
import com.homeservice.booking.enums.TerminationKind;
import com.homeservice.booking.enums.TerminationReason;
import com.homeservice.booking.policy.BookingExpirationProperties;
import com.homeservice.booking.repository.BookingRepository;
import com.homeservice.booking.repository.BookingStatusHistoryRepository;
import com.homeservice.common.enums.ActorType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Service chuyên trách xử lý nghiệp vụ hết hạn đơn đặt lịch và giải phóng lịch độc quyền (UC 51).
 * <p>
 * Đảm bảo:
 * 1. Tác vụ quét định kỳ chạy độc lập theo từng đơn (Propagation.REQUIRES_NEW), lỗi trên 1 đơn không làm dừng cả batch.
 * 2. Cung cấp cơ chế giải phóng lịch (nhả lịch) tức thì khi xét duyệt các đơn cạnh tranh.
 * 3. Hỗ trợ kiểm tra deadline tức thì tại Endpoint (Lazy check).
 */
@Slf4j
@Service
public class BookingExpirationService {

    private final BookingRepository bookingRepository;
    private final BookingStatusHistoryRepository historyRepository;
    private final BookingExpirationProperties properties;
    private final Clock clock;

    @Autowired
    public BookingExpirationService(
            BookingRepository bookingRepository,
            BookingStatusHistoryRepository historyRepository,
            BookingExpirationProperties properties,
            Clock clock
    ) {
        this.bookingRepository = bookingRepository;
        this.historyRepository = historyRepository;
        this.properties = properties;
        this.clock = clock != null ? clock : Clock.systemUTC();
    }

    public BookingExpirationService(
            BookingRepository bookingRepository,
            BookingStatusHistoryRepository historyRepository,
            BookingExpirationProperties properties
    ) {
        this(bookingRepository, historyRepository, properties, Clock.systemUTC());
    }

    /**
     * Hết hạn một đơn đặt lịch trong một Transaction độc lập mới.
     * Thích hợp cho Background Job xử lý lặp để tránh lỗi lan truyền làm rollback toàn batch.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean expireSingleBookingInNewTransaction(Long bookingId, TerminationReason reason, String note, Instant now) {
        Optional<Booking> bookingOpt = bookingRepository.findById(bookingId);
        if (bookingOpt.isEmpty()) {
            log.warn("Không tìm thấy đơn đặt lịch id={} để hết hạn", bookingId);
            return false;
        }

        Booking booking = bookingOpt.get();
        return processExpiration(booking, reason, note, now);
    }

    /**
     * Hết hạn đơn đặt lịch trong Transaction hiện tại của luồng gọi.
     * Dùng cho Endpoint Lazy Check (ví dụ: khi khách hủy hoặc NCC chấp nhận đơn cạnh tranh).
     */
    @Transactional
    public Booking expireBookingInCurrentTransaction(Booking booking, TerminationReason reason, String note, Instant now) {
        processExpiration(booking, reason, note, now);
        return booking;
    }

    /**
     * Quét và hết hạn các đơn đặt lịch quá hạn định kỳ (UC 51).
     */
    public BookingExpirationResult expireOverdueBookings() {
        return expireOverdueBookings(clock.instant());
    }

    /**
     * Quét và hết hạn các đơn đặt lịch quá hạn tại thời điểm cụ thể (phục vụ test và vận hành).
     */
    public BookingExpirationResult expireOverdueBookings(Instant now) {
        int batchSize = properties != null ? properties.getBatchSize() : 50;
        Pageable pageable = PageRequest.of(0, batchSize);

        int providerExpired = 0;
        int depositExpired = 0;
        int totalErrors = 0;

        // 1. Quét các đơn PENDING_PROVIDER quá hạn phản hồi của NCC (requestExpiresAt <= now)
        List<Booking> overdueProviders = bookingRepository.findByStatusAndRequestExpiresAtBefore(
                BookingStatus.PENDING_PROVIDER, now, pageable
        );
        for (Booking b : overdueProviders) {
            try {
                boolean success = expireSingleBookingInNewTransaction(
                        b.getId(),
                        TerminationReason.PROVIDER_RESPONSE_TIMEOUT,
                        "Quá hạn phản hồi của Nhà cung cấp (30 phút hoặc sát giờ hẹn)",
                        now
                );
                if (success) {
                    providerExpired++;
                }
            } catch (Exception ex) {
                totalErrors++;
                log.warn("Lỗi khi tự động hết hạn đơn PENDING_PROVIDER id={}: {}", b.getId(), ex.getMessage());
            }
        }

        // 2. Quét các đơn PENDING_DEPOSIT quá hạn thanh toán tiền cọc (depositDueAt <= now) - Nhả lịch độc quyền
        List<Booking> overdueDeposits = bookingRepository.findByStatusAndDepositDueAtBefore(
                BookingStatus.PENDING_DEPOSIT, now, pageable
        );
        for (Booking b : overdueDeposits) {
            try {
                boolean success = expireSingleBookingInNewTransaction(
                        b.getId(),
                        TerminationReason.DEPOSIT_TIMEOUT,
                        "Quá thời hạn giữ chỗ chờ thanh toán cọc (15 phút hoặc sát giờ hẹn)",
                        now
                );
                if (success) {
                    depositExpired++;
                }
            } catch (Exception ex) {
                totalErrors++;
                log.warn("Lỗi khi tự động hết hạn đơn PENDING_DEPOSIT id={}: {}", b.getId(), ex.getMessage());
            }
        }

        log.info("Kết quả quét hết hạn đơn: {} đơn PENDING_PROVIDER, {} đơn PENDING_DEPOSIT, {} lỗi",
                providerExpired, depositExpired, totalErrors);

        return BookingExpirationResult.builder()
                .providerExpiredCount(providerExpired)
                .depositExpiredCount(depositExpired)
                .totalErrors(totalErrors)
                .build();
    }

    /**
     * Tự động giải phóng (nhả lịch) các đơn PENDING_DEPOSIT đã quá hạn cọc của NCC đang chồng lấn với [startsAt, endsAt].
     * Được gọi tức thì trong Transaction khi NCC xét duyệt đơn mới cạnh tranh cùng khung giờ.
     */
    @Transactional
    public int releaseOverdueHoldSlots(Long providerId, Instant startsAt, Instant endsAt, Instant now) {
        List<Booking> overdueHolds = bookingRepository.findOverduePendingDepositOverlapping(
                providerId, startsAt, endsAt, now
        );

        int released = 0;
        for (Booking booking : overdueHolds) {
            boolean success = processExpiration(
                    booking,
                    TerminationReason.DEPOSIT_TIMEOUT,
                    "Quá thời hạn giữ chỗ chờ thanh toán cọc (15 phút hoặc sát giờ hẹn)",
                    now
            );
            if (success) {
                released++;
            }
        }

        if (released > 0) {
            log.info("Đã tự động giải phóng (nhả lịch) {} đơn PENDING_DEPOSIT quá hạn cọc cho NCC id={} trong khung [{}, {}]",
                    released, providerId, startsAt, endsAt);
        }

        return released;
    }

    private boolean processExpiration(Booking booking, TerminationReason reason, String note, Instant now) {
        BookingStatus currentStatus = booking.getStatus();

        // 1. Kiểm tra tính hợp lệ trước khi hết hạn
        if (currentStatus == BookingStatus.EXPIRED
                || currentStatus == BookingStatus.CANCELLED
                || currentStatus == BookingStatus.REJECTED
                || currentStatus == BookingStatus.CONFIRMED
                || currentStatus == BookingStatus.IN_PROGRESS
                || currentStatus == BookingStatus.COMPLETED) {
            // Đơn đã kết thúc hoặc đã xác nhận/đang làm/hoàn thành, bỏ qua (idempotent)
            return false;
        }

        if (reason == TerminationReason.PROVIDER_RESPONSE_TIMEOUT) {
            if (currentStatus != BookingStatus.PENDING_PROVIDER) {
                return false;
            }
            if (booking.getRequestExpiresAt() != null && now.isBefore(booking.getRequestExpiresAt())) {
                // Chưa đến hạn, không hết hạn
                return false;
            }
        } else if (reason == TerminationReason.DEPOSIT_TIMEOUT) {
            if (currentStatus != BookingStatus.PENDING_DEPOSIT) {
                return false;
            }
            if (booking.getDepositDueAt() != null && now.isBefore(booking.getDepositDueAt())) {
                // Chưa đến hạn, không hết hạn
                return false;
            }
        }

        // 2. Chuyển trạng thái sang EXPIRED và cập nhật thông tin termination
        booking.setStatus(BookingStatus.EXPIRED);
        booking.setTerminationKind(TerminationKind.EXPIRE);
        booking.setTerminationActorType(ActorType.SYSTEM);
        booking.setTerminatedByAccount(null);
        booking.setTerminationReasonCode(reason);
        booking.setTerminationReason(note);
        booking.setTerminatedAt(now);
        booking.setRefundPercent(booking.getSystemRefundPercent() != null ? booking.getSystemRefundPercent() : 100);

        Booking savedBooking = bookingRepository.save(booking);

        // 3. Ghi log lịch sử trạng thái
        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(savedBooking);
        history.setFromStatus(currentStatus);
        history.setToStatus(BookingStatus.EXPIRED);
        history.setActorType(ActorType.SYSTEM);
        history.setActorAccount(null);
        history.setReasonCode(reason.name());
        history.setNote(note);
        historyRepository.save(history);

        return true;
    }
}
