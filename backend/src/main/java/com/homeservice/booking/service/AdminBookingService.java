package com.homeservice.booking.service;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.audit.entity.AdminAuditLog;
import com.homeservice.audit.repository.AdminAuditLogRepository;
import com.homeservice.audit.service.AdminAuditLogService;
import com.homeservice.booking.dto.request.AdminBookingSearchFilter;
import com.homeservice.booking.dto.request.AdminCancelBookingRequest;
import com.homeservice.booking.dto.request.AdminHoldSettlementRequest;
import com.homeservice.booking.dto.request.AdminReleaseSettlementRequest;
import com.homeservice.booking.dto.response.AdminBookingDetailResponse;
import com.homeservice.booking.dto.response.AdminBookingSummaryResponse;
import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.entity.BookingStatusHistory;
import com.homeservice.booking.enums.BookingStatus;
import com.homeservice.booking.enums.SettlementStatus;
import com.homeservice.booking.enums.TerminationKind;
import com.homeservice.booking.enums.TerminationReason;
import com.homeservice.booking.mapper.AdminBookingMapper;
import com.homeservice.booking.repository.BookingRepository;
import com.homeservice.booking.repository.BookingStatusHistoryRepository;
import com.homeservice.booking.repository.specification.BookingSpecification;
import com.homeservice.common.dto.PageResponse;
import com.homeservice.common.enums.ActorType;
import com.homeservice.common.exception.BusinessException;
import com.homeservice.common.exception.DataConflictException;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.payment.entity.PaymentTransaction;
import com.homeservice.payment.enums.PaymentAllocationStatus;
import com.homeservice.payment.enums.PaymentKind;
import com.homeservice.payment.enums.PaymentStatus;
import com.homeservice.payment.enums.RefundReason;
import com.homeservice.payment.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Service xử lý nghiệp vụ quản trị đơn đặt lịch cho Admin (UC 31).
 */
@Service
@RequiredArgsConstructor
public class AdminBookingService {

    public static final String ENTITY_TYPE_BOOKING = "BOOKING";
    public static final String ACTION_ADMIN_CANCEL_BOOKING = "ADMIN_CANCEL_BOOKING";
    public static final String ACTION_HOLD_SETTLEMENT = "HOLD_SETTLEMENT";
    public static final String ACTION_RELEASE_SETTLEMENT = "RELEASE_SETTLEMENT";

    private static final String PROVIDER_TIMEOUT_NOTE =
            "Quá hạn phản hồi của Nhà cung cấp (30 phút hoặc sát giờ hẹn)";
    private static final String DEPOSIT_TIMEOUT_NOTE =
            "Quá thời hạn giữ chỗ chờ thanh toán cọc (15 phút hoặc sát giờ hẹn)";

    private final BookingRepository bookingRepository;
    private final BookingStatusHistoryRepository bookingStatusHistoryRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;
    private final AdminBookingMapper adminBookingMapper;
    private final AccountRepository accountRepository;
    private final AdminAuditLogService adminAuditLogService;

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "createdAt", "startsAt", "totalAmountVnd", "status", "id"
    );

    /**
     * Ngoại lệ nội bộ dùng khi phát hiện đơn đã quá hạn trong lúc khóa bi quan (Lazy Expiration).
     * Kế thừa {@link BusinessException} để trả về 400 BUSINESS_ERROR nhưng KHÔNG rollback trạng thái EXPIRED đã ghi.
     */
    static class LazyExpiredBusinessException extends BusinessException {
        LazyExpiredBusinessException(String message) {
            super(message);
        }
    }

    /**
     * Tra cứu danh sách đơn toàn hệ thống kèm phân trang và lọc đa tiêu chí (UC 31 - Nhóm A).
     *
     * @param filter Tiêu chí tìm kiếm và phân trang
     * @return Danh sách đơn đặt lịch dạng trang
     */
    @Transactional(readOnly = true)
    public PageResponse<AdminBookingSummaryResponse> getBookings(AdminBookingSearchFilter filter) {
        if (filter == null) {
            filter = new AdminBookingSearchFilter();
        }

        int page = (filter.getPage() != null && filter.getPage() >= 0) ? filter.getPage() : 0;
        int size = (filter.getSize() != null && filter.getSize() > 0) ? Math.min(filter.getSize(), 100) : 20;

        String sortBy = filter.getSortBy();
        if (sortBy == null || !ALLOWED_SORT_FIELDS.contains(sortBy)) {
            sortBy = "createdAt";
        }

        Sort.Direction direction = "ASC".equalsIgnoreCase(filter.getSortDir()) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        Page<Booking> bookingPage = bookingRepository.findAll(BookingSpecification.withFilter(filter), pageable);

        List<AdminBookingSummaryResponse> items = bookingPage.getContent().stream()
                .map(adminBookingMapper::toSummaryResponse)
                .toList();

        return new PageResponse<>(
                items,
                bookingPage.getNumber(),
                bookingPage.getSize(),
                bookingPage.getTotalElements(),
                bookingPage.getTotalPages()
        );
    }

    /**
     * Xem chi tiết toàn diện (360-degree view) một đơn đặt lịch dành cho Admin (UC 31 - Nhóm A).
     *
     * @param bookingId ID của đơn đặt lịch
     * @return Chi tiết đơn đặt lịch toàn diện
     */
    @Transactional(readOnly = true)
    public AdminBookingDetailResponse getBookingDetail(Long bookingId) {
        if (bookingId == null) {
            throw new ResourceNotFoundException("ID đơn đặt lịch không hợp lệ");
        }

        Booking booking = bookingRepository.findByIdWithDetails(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt lịch với ID: " + bookingId));

        return buildBookingDetailResponse(booking);
    }

    /**
     * Admin can thiệp hủy đơn cưỡng chế (UC 31 - Nhóm B).
     * Hỗ trợ đúng 2 hành động nghiệp vụ:
     * 1. PROVIDER_UNABLE_TO_CONTINUE: Hủy đơn đang IN_PROGRESS do NCC gặp sự cố bất khả kháng (MD05) -> hoàn 100% cọc.
     * 2. SYSTEM_CANCEL: Hủy đơn trước khi làm (PENDING_PROVIDER, PENDING_DEPOSIT, CONFIRMED) do lỗi hệ thống / vi phạm -> hoàn 100% cọc nếu đã cọc, tự động nhả lịch.
     * Ghi kiểm toán kép nguyên tử vào booking_status_history và admin_audit_logs.
     */
    @Transactional(noRollbackFor = LazyExpiredBusinessException.class)
    public AdminBookingDetailResponse cancelBookingByAdmin(
            Long adminId,
            Long bookingId,
            AdminCancelBookingRequest request
    ) {
        if (bookingId == null) {
            throw new ResourceNotFoundException("ID đơn đặt lịch không hợp lệ");
        }
        if (request == null || request.getReasonCode() == null) {
            throw new BusinessException("Mã lý do can thiệp hủy đơn không được để trống.");
        }

        TerminationReason reasonCode = request.getReasonCode();
        if (reasonCode != TerminationReason.PROVIDER_UNABLE_TO_CONTINUE
                && reasonCode != TerminationReason.SYSTEM_CANCEL) {
            throw new BusinessException(
                    "Mã lý do can thiệp không hợp lệ cho Admin. Chỉ chấp nhận PROVIDER_UNABLE_TO_CONTINUE hoặc SYSTEM_CANCEL."
            );
        }

        String trimmedReason = validateAndTrimReason(request.getReason(), "Lý do can thiệp");
        Account adminAccount = loadActiveAdmin(adminId);

        // Khóa bi quan dòng booking chống race condition
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt lịch với ID: " + bookingId));

        verifyVersionIfPresent(booking, request.getVersion());

        BookingStatus previousStatus = booking.getStatus();
        Instant now = Instant.now();

        // Kiểm tra Lazy Expiration (MD01 / UC51) dưới khóa bi quan trước khi quyết định hủy
        checkAndCommitLazyExpirationIfOverdue(booking, now);

        // Kiểm tra ma trận Trạng thái x Mã lý do
        validateCancelStateAndReason(previousStatus, reasonCode);

        // Snapshot trạng thái BEFORE phục vụ kiểm toán
        Map<String, Object> beforeState = new LinkedHashMap<>();
        beforeState.put("status", previousStatus.name());
        beforeState.put("terminationKind", booking.getTerminationKind() != null ? booking.getTerminationKind().name() : null);
        beforeState.put("terminationReasonCode", booking.getTerminationReasonCode() != null ? booking.getTerminationReasonCode().name() : null);
        beforeState.put("refundPercent", booking.getRefundPercent());

        // Chọn tỷ lệ hoàn từ snapshot hợp đồng trên đơn
        int refundPercent = (reasonCode == TerminationReason.PROVIDER_UNABLE_TO_CONTINUE)
                ? (booking.getProviderRefundPercent() != null ? booking.getProviderRefundPercent() : 100)
                : (booking.getSystemRefundPercent() != null ? booking.getSystemRefundPercent() : 100);

        // Cập nhật đơn sang CANCELLED (giữ nguyên acceptedAt / startedAt nếu có theo bất biến DB)
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setTerminationKind(TerminationKind.CANCEL);
        booking.setTerminationActorType(ActorType.ADMIN);
        booking.setTerminatedByAccount(adminAccount);
        booking.setTerminationReasonCode(reasonCode);
        booking.setTerminationReason(trimmedReason);
        booking.setTerminatedAt(now);
        booking.setRefundPercent(refundPercent);

        Booking savedBooking = bookingRepository.saveAndFlush(booking);

        // Cập nhật nghĩa vụ hoàn cọc (refund_due_vnd) nếu đơn đã thu cọc hợp lệ (CONFIRMED / IN_PROGRESS)
        Long refundDueVnd = 0L;
        Long depositPaymentTransactionId = null;
        if (previousStatus == BookingStatus.CONFIRMED || previousStatus == BookingStatus.IN_PROGRESS) {
            List<PaymentTransaction> transactions = paymentTransactionRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);
            for (PaymentTransaction tx : transactions) {
                boolean isValidDeposit = tx.getKind() == PaymentKind.DEPOSIT
                        && tx.getStatus() == PaymentStatus.SUCCEEDED
                        && (tx.getAllocationStatus() == null || tx.getAllocationStatus() == PaymentAllocationStatus.APPLIED);
                if (isValidDeposit) {
                    long baseAmount = tx.getReceivedAmountVnd() != null
                            ? tx.getReceivedAmountVnd()
                            : (savedBooking.getDepositAmountVnd() != null ? savedBooking.getDepositAmountVnd() : 0L);
                    long calculatedRefundDue = Math.round(baseAmount * refundPercent / 100.0);
                    tx.setRefundDueVnd(calculatedRefundDue);
                    tx.setRefundReason(RefundReason.CANCEL_POLICY);
                    paymentTransactionRepository.save(tx);
                    refundDueVnd = calculatedRefundDue;
                    depositPaymentTransactionId = tx.getId();
                    break;
                }
            }
        }

        // Kiểm toán kép 1: booking_status_history
        recordStatusHistory(
                savedBooking,
                previousStatus,
                BookingStatus.CANCELLED,
                adminAccount,
                reasonCode.name(),
                trimmedReason
        );

        // Kiểm toán kép 2: admin_audit_logs
        Map<String, Object> afterState = new LinkedHashMap<>();
        afterState.put("status", BookingStatus.CANCELLED.name());
        afterState.put("terminationKind", TerminationKind.CANCEL.name());
        afterState.put("terminationReasonCode", reasonCode.name());
        afterState.put("refundPercent", refundPercent);
        afterState.put("refundDueVnd", refundDueVnd);
        afterState.put("depositPaymentTransactionId", depositPaymentTransactionId);

        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("before", beforeState);
        changes.put("after", afterState);

        adminAuditLogService.record(
                adminAccount,
                ACTION_ADMIN_CANCEL_BOOKING,
                ENTITY_TYPE_BOOKING,
                String.valueOf(savedBooking.getId()),
                trimmedReason,
                changes,
                now
        );

        return reloadAndBuildDetailResponse(savedBooking);
    }

    /**
     * Admin tạm giữ đối soát đơn đặt lịch (settlement_status -> ON_HOLD) kèm ghi chú bắt buộc (UC 31 - Nhóm B).
     * Áp dụng cho đơn đã COMPLETED hoặc CANCELLED (khi có tranh chấp/khiếu nại cần chặn chi trả UC48).
     * Tuân thủ database-design-final.md mục 7.1: Nếu chuyển ngoại lệ từ FINALIZED -> ON_HOLD, bảo toàn settled_at,
     * settled_by_admin_id và 5 cột tiền đối soát cũ để truy vết.
     */
    @Transactional
    public AdminBookingDetailResponse holdSettlementByAdmin(
            Long adminId,
            Long bookingId,
            AdminHoldSettlementRequest request
    ) {
        if (bookingId == null) {
            throw new ResourceNotFoundException("ID đơn đặt lịch không hợp lệ");
        }
        if (request == null) {
            throw new BusinessException("Thông tin yêu cầu tạm giữ đối soát không được để trống.");
        }

        String trimmedReason = validateAndTrimReason(request.getReason(), "Lý do tạm giữ đối soát");
        Account adminAccount = loadActiveAdmin(adminId);

        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt lịch với ID: " + bookingId));

        verifyVersionIfPresent(booking, request.getVersion());

        BookingStatus currentStatus = booking.getStatus();
        if (currentStatus != BookingStatus.COMPLETED && currentStatus != BookingStatus.CANCELLED) {
            throw new BusinessException(
                    "Chỉ được phép tạm giữ đối soát trên đơn đã hoàn thành (COMPLETED) hoặc đã hủy (CANCELLED). Trạng thái hiện tại: " + currentStatus
            );
        }

        SettlementStatus previousSettlementStatus = booking.getSettlementStatus();
        if (previousSettlementStatus == SettlementStatus.ON_HOLD) {
            throw new BusinessException("Đơn đặt lịch hiện đã ở trạng thái tạm giữ đối soát (ON_HOLD).");
        }

        String previousSettlementNote = booking.getSettlementNote();
        Instant now = Instant.now();

        Map<String, Object> beforeState = new LinkedHashMap<>();
        beforeState.put("settlementStatus", previousSettlementStatus != null ? previousSettlementStatus.name() : null);
        beforeState.put("settlementNote", previousSettlementNote);
        beforeState.put("settledAt", booking.getSettledAt() != null ? booking.getSettledAt().toString() : null);
        beforeState.put("settledByAdminId", booking.getSettledByAdmin() != null ? booking.getSettledByAdmin().getId() : null);

        // Chuyển sang ON_HOLD, giữ nguyên settledAt, settledByAdmin và 5 cột tiền đối soát nếu có
        booking.setSettlementStatus(SettlementStatus.ON_HOLD);
        booking.setSettlementNote(trimmedReason);

        Booking savedBooking = bookingRepository.saveAndFlush(booking);

        // Kiểm toán kép 1: booking_status_history (ghi nhận mốc sự kiện ngoài termination)
        recordStatusHistory(
                savedBooking,
                currentStatus,
                currentStatus,
                adminAccount,
                ACTION_HOLD_SETTLEMENT,
                trimmedReason
        );

        // Kiểm toán kép 2: admin_audit_logs
        Map<String, Object> afterState = new LinkedHashMap<>();
        afterState.put("settlementStatus", SettlementStatus.ON_HOLD.name());
        afterState.put("settlementNote", trimmedReason);
        afterState.put("settledAt", savedBooking.getSettledAt() != null ? savedBooking.getSettledAt().toString() : null);
        afterState.put("settledByAdminId", savedBooking.getSettledByAdmin() != null ? savedBooking.getSettledByAdmin().getId() : null);

        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("before", beforeState);
        changes.put("after", afterState);

        adminAuditLogService.record(
                adminAccount,
                ACTION_HOLD_SETTLEMENT,
                ENTITY_TYPE_BOOKING,
                String.valueOf(savedBooking.getId()),
                trimmedReason,
                changes,
                now
        );

        return reloadAndBuildDetailResponse(savedBooking);
    }

    /**
     * Admin mở lại đối soát đơn đặt lịch từ trạng thái ON_HOLD về DRAFT sau khi giải quyết xong khiếu nại (UC 31 - Nhóm B).
     * Tuân thủ database-design-final.md mục 7.1: Không tự kéo ngược về DRAFT nếu đơn đã từng chốt (settled_at != null).
     */
    @Transactional
    public AdminBookingDetailResponse releaseSettlementByAdmin(
            Long adminId,
            Long bookingId,
            AdminReleaseSettlementRequest request
    ) {
        if (bookingId == null) {
            throw new ResourceNotFoundException("ID đơn đặt lịch không hợp lệ");
        }
        if (request == null) {
            throw new BusinessException("Thông tin yêu cầu mở lại đối soát không được để trống.");
        }

        String trimmedReason = validateAndTrimReason(request.getReason(), "Lý do mở lại đối soát");
        Account adminAccount = loadActiveAdmin(adminId);

        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt lịch với ID: " + bookingId));

        verifyVersionIfPresent(booking, request.getVersion());

        SettlementStatus previousSettlementStatus = booking.getSettlementStatus();
        if (previousSettlementStatus == SettlementStatus.DRAFT) {
            throw new BusinessException("Đơn đặt lịch không ở trạng thái tạm giữ đối soát (ON_HOLD).");
        }
        if (previousSettlementStatus == SettlementStatus.FINALIZED) {
            throw new BusinessException("Đơn đặt lịch đã chốt đối soát (FINALIZED), không thể thực hiện mở tạm giữ.");
        }
        if (previousSettlementStatus != SettlementStatus.ON_HOLD) {
            throw new BusinessException("Trạng thái đối soát hiện tại không hợp lệ để mở lại: " + previousSettlementStatus);
        }

        if (booking.getSettledAt() != null) {
            throw new BusinessException(
                    "Đơn đặt lịch đã từng chốt đối soát trước khi tạm giữ (có mốc settledAt). Không thể tự động đưa về DRAFT; vui lòng xử lý qua quy trình đối soát lại."
            );
        }

        BookingStatus currentStatus = booking.getStatus();
        String previousSettlementNote = booking.getSettlementNote();
        Instant now = Instant.now();

        Map<String, Object> beforeState = new LinkedHashMap<>();
        beforeState.put("settlementStatus", previousSettlementStatus.name());
        beforeState.put("settlementNote", previousSettlementNote);

        booking.setSettlementStatus(SettlementStatus.DRAFT);
        booking.setSettlementNote(trimmedReason);

        Booking savedBooking = bookingRepository.saveAndFlush(booking);

        // Kiểm toán kép 1: booking_status_history
        recordStatusHistory(
                savedBooking,
                currentStatus,
                currentStatus,
                adminAccount,
                ACTION_RELEASE_SETTLEMENT,
                trimmedReason
        );

        // Kiểm toán kép 2: admin_audit_logs
        Map<String, Object> afterState = new LinkedHashMap<>();
        afterState.put("settlementStatus", SettlementStatus.DRAFT.name());
        afterState.put("settlementNote", trimmedReason);

        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("before", beforeState);
        changes.put("after", afterState);

        adminAuditLogService.record(
                adminAccount,
                ACTION_RELEASE_SETTLEMENT,
                ENTITY_TYPE_BOOKING,
                String.valueOf(savedBooking.getId()),
                trimmedReason,
                changes,
                now
        );

        return reloadAndBuildDetailResponse(savedBooking);
    }

    private String validateAndTrimReason(String reason, String fieldLabel) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new BusinessException(fieldLabel + " không được để trống.");
        }
        String trimmed = reason.trim();
        if (trimmed.length() < 5 || trimmed.length() > 500) {
            throw new BusinessException(fieldLabel + " phải từ 5 đến 500 ký tự.");
        }
        return trimmed;
    }

    private Account loadActiveAdmin(Long adminId) {
        if (adminId == null) {
            throw new AccessDeniedException("Không xác định được tài khoản Quản trị viên.");
        }
        Account admin = accountRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản Quản trị viên: " + adminId));

        if (admin.getAccountType() != AccountType.ADMIN) {
            throw new AccessDeniedException("Tài khoản không có quyền Quản trị viên.");
        }
        if (admin.getStatus() != AccountStatus.ACTIVE) {
            throw new AccessDeniedException("Tài khoản Quản trị viên chưa được kích hoạt hoặc đã bị khóa.");
        }
        return admin;
    }

    private void verifyVersionIfPresent(Booking booking, Long requestedVersion) {
        if (requestedVersion != null && !requestedVersion.equals(booking.getVersion())) {
            throw new DataConflictException(
                    "Thông tin đơn đặt lịch đã bị thay đổi đồng thời. Vui lòng tải lại dữ liệu mới nhất và thử lại."
            );
        }
    }

    private void checkAndCommitLazyExpirationIfOverdue(Booking booking, Instant now) {
        BookingStatus currentStatus = booking.getStatus();
        if (currentStatus == BookingStatus.PENDING_PROVIDER
                && booking.getRequestExpiresAt() != null
                && !now.isBefore(booking.getRequestExpiresAt())) {
            commitLazyExpiration(
                    booking,
                    BookingStatus.PENDING_PROVIDER,
                    TerminationReason.PROVIDER_RESPONSE_TIMEOUT,
                    PROVIDER_TIMEOUT_NOTE,
                    now
            );
            throw new LazyExpiredBusinessException(
                    "Đơn đặt lịch đã quá hạn phản hồi của Nhà cung cấp và đã tự động kết thúc (EXPIRED)."
            );
        }

        if (currentStatus == BookingStatus.PENDING_DEPOSIT
                && booking.getDepositDueAt() != null
                && !now.isBefore(booking.getDepositDueAt())) {
            commitLazyExpiration(
                    booking,
                    BookingStatus.PENDING_DEPOSIT,
                    TerminationReason.DEPOSIT_TIMEOUT,
                    DEPOSIT_TIMEOUT_NOTE,
                    now
            );
            throw new LazyExpiredBusinessException(
                    "Đơn đặt lịch đã quá thời hạn giữ chỗ chờ thanh toán cọc và đã tự động kết thúc (EXPIRED)."
            );
        }
    }

    private void commitLazyExpiration(
            Booking booking,
            BookingStatus fromStatus,
            TerminationReason reasonCode,
            String note,
            Instant now
    ) {
        booking.setStatus(BookingStatus.EXPIRED);
        booking.setTerminationKind(TerminationKind.EXPIRE);
        booking.setTerminationActorType(ActorType.SYSTEM);
        booking.setTerminatedByAccount(null);
        booking.setTerminationReasonCode(reasonCode);
        booking.setTerminationReason(note);
        booking.setTerminatedAt(now);
        booking.setRefundPercent(booking.getSystemRefundPercent() != null ? booking.getSystemRefundPercent() : 100);
        Booking expiredBooking = bookingRepository.saveAndFlush(booking);

        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(expiredBooking);
        history.setFromStatus(fromStatus);
        history.setToStatus(BookingStatus.EXPIRED);
        history.setActorType(ActorType.SYSTEM);
        history.setActorAccount(null);
        history.setReasonCode(reasonCode.name());
        history.setNote(note);
        bookingStatusHistoryRepository.save(history);
    }

    private void validateCancelStateAndReason(BookingStatus currentStatus, TerminationReason reasonCode) {
        if (currentStatus == BookingStatus.COMPLETED) {
            throw new BusinessException(
                    "Không được phép hủy đơn đã hoàn thành (COMPLETED). Vui lòng xử lý tranh chấp qua khiếu nại và tạm giữ đối soát."
            );
        }
        if (currentStatus == BookingStatus.CANCELLED
                || currentStatus == BookingStatus.REJECTED
                || currentStatus == BookingStatus.EXPIRED) {
            throw new BusinessException("Đơn đặt lịch đã kết thúc ở trạng thái " + currentStatus + ", không thể hủy lại.");
        }

        if (reasonCode == TerminationReason.PROVIDER_UNABLE_TO_CONTINUE) {
            if (currentStatus != BookingStatus.IN_PROGRESS) {
                throw new BusinessException(
                        "Mã lý do PROVIDER_UNABLE_TO_CONTINUE chỉ áp dụng khi đơn đang thực hiện (IN_PROGRESS). Trạng thái hiện tại: " + currentStatus
                );
            }
        } else if (reasonCode == TerminationReason.SYSTEM_CANCEL) {
            if (currentStatus != BookingStatus.PENDING_PROVIDER
                    && currentStatus != BookingStatus.PENDING_DEPOSIT
                    && currentStatus != BookingStatus.CONFIRMED) {
                throw new BusinessException(
                        "Mã lý do SYSTEM_CANCEL chỉ áp dụng trước khi dịch vụ bắt đầu (PENDING_PROVIDER, PENDING_DEPOSIT, CONFIRMED). Trạng thái hiện tại: " + currentStatus
                );
            }
        }
    }

    private void recordStatusHistory(
            Booking booking,
            BookingStatus fromStatus,
            BookingStatus toStatus,
            Account adminAccount,
            String reasonCode,
            String note
    ) {
        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(booking);
        history.setFromStatus(fromStatus);
        history.setToStatus(toStatus);
        history.setActorType(ActorType.ADMIN);
        history.setActorAccount(adminAccount);
        history.setReasonCode(reasonCode);
        history.setNote(note);
        bookingStatusHistoryRepository.save(history);
    }

    private AdminBookingDetailResponse reloadAndBuildDetailResponse(Booking savedBooking) {
        Booking hydratedBooking = bookingRepository.findByIdWithDetails(savedBooking.getId())
                .orElse(savedBooking);
        return buildBookingDetailResponse(hydratedBooking);
    }

    private AdminBookingDetailResponse buildBookingDetailResponse(Booking booking) {
        Long bookingId = booking.getId();
        List<BookingStatusHistory> statusHistories = bookingStatusHistoryRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);
        List<PaymentTransaction> transactions = paymentTransactionRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);
        List<AdminAuditLog> auditLogs = adminAuditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
                ENTITY_TYPE_BOOKING, String.valueOf(bookingId)
        );
        return adminBookingMapper.toDetailResponse(booking, statusHistories, transactions, auditLogs);
    }
}
