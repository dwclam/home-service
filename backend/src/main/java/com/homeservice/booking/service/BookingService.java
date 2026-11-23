package com.homeservice.booking.service;

import com.homeservice.account.entity.Account;
import com.homeservice.account.entity.CustomerAddress;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.account.repository.CustomerAddressRepository;
import com.homeservice.booking.dto.request.AcceptBookingRequest;
import com.homeservice.booking.dto.request.CancelBookingRequest;
import com.homeservice.booking.dto.request.ProviderCancelBookingRequest;
import com.homeservice.booking.dto.request.RejectBookingRequest;
import com.homeservice.booking.dto.request.StartServiceRequest;
import com.homeservice.booking.dto.request.CompleteServiceRequest;
import com.homeservice.booking.dto.request.CreateBookingRequest;
import com.homeservice.booking.dto.response.BookingDetailResponse;
import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.entity.BookingStatusHistory;
import com.homeservice.booking.enums.BookingStatus;
import com.homeservice.booking.enums.SettlementStatus;
import com.homeservice.booking.enums.TerminationKind;
import com.homeservice.booking.enums.TerminationReason;
import com.homeservice.booking.mapper.BookingMapper;
import com.homeservice.booking.policy.BookingPolicyProperties;
import com.homeservice.booking.repository.BookingRepository;
import com.homeservice.booking.repository.BookingStatusHistoryRepository;
import com.homeservice.catalog.entity.ServiceOffering;
import com.homeservice.catalog.enums.ServiceStatus;
import com.homeservice.catalog.repository.ServiceOfferingRepository;
import com.homeservice.common.enums.ActorType;
import com.homeservice.common.exception.BusinessException;
import com.homeservice.common.exception.DataConflictException;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.payment.entity.PaymentTransaction;
import com.homeservice.payment.enums.PaymentKind;
import com.homeservice.payment.enums.PaymentStatus;
import com.homeservice.payment.enums.RefundReason;
import com.homeservice.payment.repository.PaymentTransactionRepository;
import com.homeservice.provider.entity.ProviderProfile;
import com.homeservice.provider.repository.ProviderAvailabilityRepository;
import lombok.RequiredArgsConstructor;
import com.homeservice.booking.policy.BookingExpirationProperties;
import org.springframework.beans.factory.annotation.Autowired;
import java.time.Clock;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingStatusHistoryRepository historyRepository;
    private final AccountRepository accountRepository;
    private final CustomerAddressRepository customerAddressRepository;
    private final ServiceOfferingRepository serviceOfferingRepository;
    private final ProviderAvailabilityRepository providerAvailabilityRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final BookingMapper bookingMapper;
    private final BookingPolicyProperties policyProperties;
    private final BookingExpirationService bookingExpirationService;

    @Autowired
    public BookingService(
            BookingRepository bookingRepository,
            BookingStatusHistoryRepository historyRepository,
            AccountRepository accountRepository,
            CustomerAddressRepository customerAddressRepository,
            ServiceOfferingRepository serviceOfferingRepository,
            ProviderAvailabilityRepository providerAvailabilityRepository,
            PaymentTransactionRepository paymentTransactionRepository,
            BookingMapper bookingMapper,
            BookingPolicyProperties policyProperties,
            BookingExpirationService bookingExpirationService
    ) {
        this.bookingRepository = bookingRepository;
        this.historyRepository = historyRepository;
        this.accountRepository = accountRepository;
        this.customerAddressRepository = customerAddressRepository;
        this.serviceOfferingRepository = serviceOfferingRepository;
        this.providerAvailabilityRepository = providerAvailabilityRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.bookingMapper = bookingMapper;
        this.policyProperties = policyProperties;
        this.bookingExpirationService = bookingExpirationService != null
                ? bookingExpirationService
                : new BookingExpirationService(bookingRepository, historyRepository, new BookingExpirationProperties(), Clock.systemUTC());
    }

    public BookingService(
            BookingRepository bookingRepository,
            BookingStatusHistoryRepository historyRepository,
            AccountRepository accountRepository,
            CustomerAddressRepository customerAddressRepository,
            ServiceOfferingRepository serviceOfferingRepository,
            ProviderAvailabilityRepository providerAvailabilityRepository,
            PaymentTransactionRepository paymentTransactionRepository,
            BookingMapper bookingMapper,
            BookingPolicyProperties policyProperties
    ) {
        this(bookingRepository, historyRepository, accountRepository, customerAddressRepository,
                serviceOfferingRepository, providerAvailabilityRepository, paymentTransactionRepository,
                bookingMapper, policyProperties, null);
    }

    @Transactional
    public BookingDetailResponse createBooking(Long customerId, CreateBookingRequest request) {
        // 1. Idempotency Check: (customer_id, client_request_key)
        Optional<Booking> existing = bookingRepository.findByCustomerIdAndClientRequestKey(
                customerId, request.getClientRequestKey()
        );
        if (existing.isPresent()) {
            return bookingMapper.toDetailResponse(existing.get());
        }

        Instant now = Instant.now();

        // 2. Validate Customer Status
        Account customer = accountRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin khách hàng"));

        if (customer.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Tài khoản khách hàng chưa được kích hoạt hoặc đã bị khóa");
        }

        // 3. MD09 Check: Customer must not have overdue 70% balance on completed bookings
        if (bookingRepository.hasOverdueBalance(customerId, now)) {
            throw new BusinessException("Khách hàng có đơn hoàn thành quá hạn thanh toán 70%. Vui lòng hoàn tất thanh toán trước khi đặt đơn mới");
        }

        // 4. Validate Service and Provider
        ServiceOffering service = serviceOfferingRepository.findById(request.getServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói dịch vụ yêu cầu"));

        if (service.getStatus() != ServiceStatus.PUBLISHED) {
            throw new BusinessException("Dịch vụ này hiện không còn nhận đặt lịch");
        }

        if (service.getCategory() == null || !Boolean.TRUE.equals(service.getCategory().getIsActive())) {
            throw new BusinessException("Danh mục dịch vụ này đang tạm ngưng hoạt động");
        }

        ProviderProfile provider = service.getProvider();
        if (provider == null || !provider.getAccountId().equals(request.getProviderId())) {
            throw new BusinessException("Dịch vụ được chọn không thuộc về Nhà cung cấp này");
        }

        if (!Boolean.TRUE.equals(provider.getIsVisible())) {
            throw new BusinessException("Hồ sơ Nhà cung cấp hiện không hiển thị công khai");
        }

        Account providerAccount = provider.getAccount();
        if (providerAccount == null || providerAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Tài khoản Nhà cung cấp hiện đang tạm ngưng hoặc không hoạt động");
        }

        // 5. MD01 Check: Lead-time minimum 60 minutes
        Instant startsAt = request.getStartsAt();
        Duration minLeadTime = Duration.ofMinutes(policyProperties.getLeadTimeMinutes());
        if (startsAt.isBefore(now.plus(minLeadTime))) {
            throw new BusinessException("Thời gian đặt lịch phải cách thời điểm hiện tại ít nhất 60 phút");
        }

        // 6. Schedule Coverage and Overlap Validation
        int durationMinutes = service.getDurationMinutes();
        Instant endsAt = startsAt.plus(Duration.ofMinutes(durationMinutes));

        // Provider must have available slot covering [startsAt, endsAt]
        boolean isCovered = providerAvailabilityRepository.isCoveredByAvailableSlot(
                provider.getAccountId(), startsAt, endsAt
        );
        if (!isCovered) {
            throw new BusinessException("Nhà cung cấp không mở lịch làm việc trong khung giờ này");
        }

        // Provider must not have BLOCKED availability overlapping [startsAt, endsAt]
        boolean isBlocked = providerAvailabilityRepository.hasBlockedOverlap(
                provider.getAccountId(), startsAt, endsAt
        );
        if (isBlocked) {
            throw new BusinessException("Nhà cung cấp đã khóa nhận lịch trong khung giờ này");
        }

        // Provider must not have overlapping exclusive bookings
        boolean hasOverlapBooking = bookingRepository.hasOverlappingExclusiveBooking(
                provider.getAccountId(), startsAt, endsAt, now
        );
        if (hasOverlapBooking) {
            throw new BusinessException("Nhà cung cấp đã có đơn dịch vụ đã xác nhận trong khung giờ này");
        }

        // 7. Resolve Address Snapshot (Saved Address vs Explicit Input)
        CustomerAddress address = null;
        String recipientName = request.getRecipientName();
        String recipientPhone = request.getRecipientPhone();
        String addressLine = request.getAddressLine();
        String ward = request.getWard();
        String city = request.getCity();
        String addressInstructions = request.getAddressInstructions();

        if (request.getAddressId() != null) {
            address = customerAddressRepository.findById(request.getAddressId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ được chọn"));

                        if (!address.getCustomer().getId().equals(customerId)) {
                throw new BusinessException("Địa chỉ được chọn không thuộc quyền sở hữu của khách hàng");
            }

            if (address.getArchivedAt() != null) {
                throw new BusinessException("Địa chỉ này đã bị lưu trữ, vui lòng chọn địa chỉ khác");
            }

            if (recipientName == null || recipientName.isBlank()) recipientName = address.getRecipientName();
            if (recipientPhone == null || recipientPhone.isBlank()) recipientPhone = address.getRecipientPhone();
            if (addressLine == null || addressLine.isBlank()) addressLine = address.getAddressLine();
            if (ward == null || ward.isBlank()) ward = address.getWard();
            if (city == null || city.isBlank()) city = address.getCity();
            if (addressInstructions == null || addressInstructions.isBlank()) addressInstructions = address.getInstructions();
        }

        if (recipientName == null || recipientName.isBlank()) {
            throw new BusinessException("Tên người nhận không được để trống");
        }
        if (recipientPhone == null || recipientPhone.isBlank()) {
            throw new BusinessException("Số điện thoại người nhận không được để trống");
        }
        if (addressLine == null || addressLine.isBlank()) {
            throw new BusinessException("Địa chỉ chi tiết không được để trống");
        }
        if (city == null || city.isBlank()) {
            throw new BusinessException("Tỉnh/Thành phố không được để trống");
        }

        // 8. Calculations and Policy Snapshot from System Fixed Policy
        long totalAmountVnd = service.getBasePriceVnd();
        int depositPercent = policyProperties.getDepositPercent();
        long depositAmountVnd = policyProperties.calculateDepositAmountVnd(totalAmountVnd);
        long balanceAmountVnd = policyProperties.calculateBalanceAmountVnd(totalAmountVnd, depositAmountVnd);
        int platformFeePercent = policyProperties.getPlatformFeePercent();
        int cancelCutoffMinutes = policyProperties.getCancelCutoffMinutes();
        int earlyRefundPercent = policyProperties.getEarlyRefundPercent();
        int lateRefundPercent = policyProperties.getLateRefundPercent();
        int providerRefundPercent = policyProperties.getProviderRefundPercent();
        int systemRefundPercent = policyProperties.getSystemRefundPercent();

        // request_expires_at = min(now + requestExpireMinutes, starts_at - requestExpireMinutes) (MD01)
        Instant requestExpiresAt = policyProperties.calculateRequestExpiresAt(now, startsAt);

        String bookingCode = generateBookingCode();

        // 9. Build Booking Entity
        Booking booking = new Booking();
        booking.setBookingCode(bookingCode);
        booking.setClientRequestKey(request.getClientRequestKey());
        booking.setCustomer(customer);
        booking.setProvider(provider);
        booking.setService(service);
        booking.setAddress(address);
        booking.setServiceTitleSnapshot(service.getTitle());
        booking.setDurationMinutesSnapshot(durationMinutes);
        booking.setRecipientName(recipientName.trim());
        booking.setRecipientPhone(recipientPhone.trim());
        booking.setAddressLine(addressLine.trim());
        booking.setWard(ward != null ? ward.trim() : null);
        booking.setCity(city.trim());
        booking.setAddressInstructions(addressInstructions != null ? addressInstructions.trim() : null);
        booking.setStartsAt(startsAt);
        booking.setEndsAt(endsAt);
        booking.setStatus(BookingStatus.PENDING_PROVIDER);
        booking.setRequestExpiresAt(requestExpiresAt);
        booking.setTotalAmountVnd(totalAmountVnd);
        booking.setDepositPercent(depositPercent);
        booking.setDepositAmountVnd(depositAmountVnd);
        booking.setBalanceAmountVnd(balanceAmountVnd);
        booking.setPlatformFeePercent(platformFeePercent);
        booking.setCancelCutoffMinutes(cancelCutoffMinutes);
        booking.setEarlyRefundPercent(earlyRefundPercent);
        booking.setLateRefundPercent(lateRefundPercent);
        booking.setProviderRefundPercent(providerRefundPercent);
        booking.setSystemRefundPercent(systemRefundPercent);
        booking.setSettlementStatus(SettlementStatus.DRAFT);
        booking.setCustomerNote(request.getCustomerNote() != null ? request.getCustomerNote().trim() : null);

        Booking savedBooking = bookingRepository.save(booking);

        // 10. Record Status History
        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(savedBooking);
        history.setFromStatus(null);
        history.setToStatus(BookingStatus.PENDING_PROVIDER);
        history.setActorType(ActorType.CUSTOMER);
        history.setActorAccount(customer);
        history.setReasonCode("BOOKING_CREATED");
        history.setNote("Khách hàng tạo yêu cầu đặt lịch");
        historyRepository.save(history);

        return bookingMapper.toDetailResponse(savedBooking);
    }

    @Transactional
    public BookingDetailResponse cancelBookingByCustomer(Long customerId, Long bookingId, CancelBookingRequest request) {
        // 1. Validate customer account exists
        Account customer = accountRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin khách hàng"));

        // 2. Find booking
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt lịch: " + bookingId));

        // 3. Ownership check: Must be the customer who created this booking
        if (booking.getCustomer() == null || !booking.getCustomer().getId().equals(customerId)) {
            throw new AccessDeniedException("Bạn không có quyền thao tác trên đơn đặt lịch này");
        }

        // 4. Optimistic locking check
        if (request.getVersion() != null && !request.getVersion().equals(booking.getVersion())) {
            throw new DataConflictException("Thông tin đơn đặt lịch đã bị thay đổi đồng thời. Vui lòng tải lại trang và thử lại.");
        }

        // 5. Status & Timing checks
        BookingStatus currentStatus = booking.getStatus();
        Instant now = Instant.now();
        int refundPercent;
        long refundDueVnd = 0L;

        switch (currentStatus) {
            case PENDING_PROVIDER -> {
                // Endpoint Lazy Check (MD01 / UC 51): Kiem tra deadline phan hoi cua NCC
                if (booking.getRequestExpiresAt() != null && !now.isBefore(booking.getRequestExpiresAt())) {
                    if (bookingExpirationService != null) {
                        bookingExpirationService.expireSingleBookingInNewTransaction(
                                booking.getId(),
                                TerminationReason.PROVIDER_RESPONSE_TIMEOUT,
                                "Quá hạn phản hồi của Nhà cung cấp (30 phút hoặc sát giờ hẹn)",
                                now
                        );
                    }
                    booking.setStatus(BookingStatus.EXPIRED);
                    booking.setTerminationKind(TerminationKind.EXPIRE);
                    booking.setTerminationReasonCode(TerminationReason.PROVIDER_RESPONSE_TIMEOUT);
                    booking.setTerminationReason("Quá hạn phản hồi của Nhà cung cấp (30 phút hoặc sát giờ hẹn)");
                    booking.setTerminatedAt(now);
                    booking.setTerminationActorType(ActorType.SYSTEM);
                    throw new BusinessException("Đơn đặt lịch đã quá hạn phản hồi của Nhà cung cấp và đã kết thúc (EXPIRED).");
                }
                refundPercent = booking.getProviderRefundPercent() != null ? booking.getProviderRefundPercent() : 100;
                refundDueVnd = 0L;
            }
            case PENDING_DEPOSIT -> {
                // Endpoint Lazy Check (MD01 / UC 51): Kiem tra deadline giu cho coc
                if (booking.getDepositDueAt() != null && !now.isBefore(booking.getDepositDueAt())) {
                    if (bookingExpirationService != null) {
                        bookingExpirationService.expireSingleBookingInNewTransaction(
                                booking.getId(),
                                TerminationReason.DEPOSIT_TIMEOUT,
                                "Quá thời hạn giữ chỗ chờ thanh toán cọc (15 phút hoặc sát giờ hẹn)",
                                now
                        );
                    }
                    booking.setStatus(BookingStatus.EXPIRED);
                    booking.setTerminationKind(TerminationKind.EXPIRE);
                    booking.setTerminationReasonCode(TerminationReason.DEPOSIT_TIMEOUT);
                    booking.setTerminationReason("Quá thời hạn giữ chỗ chờ thanh toán cọc (15 phút hoặc sát giờ hẹn)");
                    booking.setTerminatedAt(now);
                    booking.setTerminationActorType(ActorType.SYSTEM);
                    throw new BusinessException("Đơn đặt lịch đã quá thời hạn giữ chỗ chờ thanh toán cọc và đã kết thúc (EXPIRED).");
                }
                refundPercent = booking.getProviderRefundPercent() != null ? booking.getProviderRefundPercent() : 100;
                refundDueVnd = 0L;
            }
            case CONFIRMED -> {
                // Deposit was paid, checking timing vs startsAt
                Instant startsAt = booking.getStartsAt();
                if (!now.isBefore(startsAt)) {
                    // now >= startsAt: Cancellation after startsAt is strictly disallowed
                    throw new BusinessException("Đã đến hoặc quá giờ hẹn. Vui lòng liên hệ bộ phận hỗ trợ khách hàng để được xử lý.");
                }

                int cutoffMinutes = booking.getCancelCutoffMinutes() != null ? booking.getCancelCutoffMinutes() : 30;
                Instant cutoffTime = startsAt.minus(Duration.ofMinutes(cutoffMinutes));

                if (!now.isAfter(cutoffTime)) {
                    // Early cancel: at least cutoffMinutes before startsAt -> earlyRefundPercent (50%)
                    refundPercent = booking.getEarlyRefundPercent() != null ? booking.getEarlyRefundPercent() : 50;
                } else {
                    // Late cancel: less than cutoffMinutes before startsAt -> lateRefundPercent (0%)
                    refundPercent = booking.getLateRefundPercent() != null ? booking.getLateRefundPercent() : 0;
                }

                if (refundPercent > 0 && booking.getDepositAmountVnd() != null) {
                    refundDueVnd = Math.round(booking.getDepositAmountVnd() * refundPercent / 100.0);
                }

                final long finalRefundDueVnd = refundDueVnd;
                // If deposit payment exists, update refund_due_vnd
                if (paymentTransactionRepository != null) {
                    Optional<PaymentTransaction> depositTx = paymentTransactionRepository
                            .findFirstByBookingIdAndKindAndStatusOrderByCreatedAtDesc(
                                    bookingId, PaymentKind.DEPOSIT, PaymentStatus.SUCCEEDED
                            );
                    depositTx.ifPresent(tx -> {
                        tx.setRefundDueVnd(finalRefundDueVnd);
                        tx.setRefundReason(RefundReason.CANCEL_POLICY);
                        paymentTransactionRepository.save(tx);
                    });
                }
            }
            case IN_PROGRESS -> throw new BusinessException("Không thể hủy khi dịch vụ đang được thực hiện.");
            case COMPLETED -> throw new BusinessException("Không thể hủy đơn đặt lịch đã hoàn thành.");
            case CANCELLED, REJECTED, EXPIRED -> throw new BusinessException("Đơn đặt lịch đã kết thúc trước đó.");
            default -> throw new BusinessException("Trạng thái đơn không hợp lệ để hủy: " + currentStatus);
        }

        // 6. Update Booking
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setTerminationKind(TerminationKind.CANCEL);
        booking.setTerminationActorType(ActorType.CUSTOMER);
        booking.setTerminatedByAccount(customer);
        booking.setTerminationReasonCode(TerminationReason.CUSTOMER_CANCEL);
        String reasonText = request.getReason() != null && !request.getReason().trim().isEmpty()
                ? request.getReason().trim()
                : null;
        booking.setTerminationReason(reasonText);
        booking.setTerminatedAt(now);
        booking.setRefundPercent(refundPercent);

        Booking savedBooking = bookingRepository.save(booking);

        // 7. Record History
        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(savedBooking);
        history.setFromStatus(currentStatus);
        history.setToStatus(BookingStatus.CANCELLED);
        history.setActorType(ActorType.CUSTOMER);
        history.setActorAccount(customer);
        history.setReasonCode("CUSTOMER_CANCEL");
        history.setNote(reasonText != null ? reasonText : "Khách hàng hủy đơn đặt lịch");
        historyRepository.save(history);

        return bookingMapper.toDetailResponse(savedBooking);
    }

    @Transactional
    public BookingDetailResponse acceptBookingByProvider(Long providerAccountId, Long bookingId, AcceptBookingRequest request) {
        // 1. Validate provider account
        Account providerAccount = accountRepository.findById(providerAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin nhà cung cấp: " + providerAccountId));

        if (providerAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Tài khoản nhà cung cấp chưa được kích hoạt hoặc đã bị khóa.");
        }

        // 2. Find booking
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt lịch: " + bookingId));

        // 3. Ownership check: Must be the provider assigned to this booking
        if (booking.getProvider() == null || !booking.getProvider().getAccountId().equals(providerAccountId)) {
            throw new AccessDeniedException("Bạn không có quyền thao tác trên đơn đặt lịch của nhà cung cấp khác.");
        }

        // 4. Optimistic locking check
        if (request != null && request.getVersion() != null && !request.getVersion().equals(booking.getVersion())) {
            throw new DataConflictException("Thông tin đơn đặt lịch đã bị thay đổi đồng thời. Vui lòng tải lại trang và thử lại.");
        }

        Instant now = Instant.now();

        // 5. Current status check: Must be PENDING_PROVIDER
        if (booking.getStatus() != BookingStatus.PENDING_PROVIDER) {
            throw new BusinessException("Đơn đặt lịch không ở trạng thái chờ phản hồi: " + booking.getStatus());
        }

        // 6. Deadline check (MD01 / UC 51): now must be before requestExpiresAt
        if (now.isAfter(booking.getRequestExpiresAt())) {
            if (bookingExpirationService != null) {
                bookingExpirationService.expireSingleBookingInNewTransaction(
                        booking.getId(),
                        TerminationReason.PROVIDER_RESPONSE_TIMEOUT,
                        "Quá hạn phản hồi của Nhà cung cấp (30 phút hoặc sát giờ hẹn)",
                        now
                );
            }
            booking.setStatus(BookingStatus.EXPIRED);
            booking.setTerminationKind(TerminationKind.EXPIRE);
            booking.setTerminationReasonCode(TerminationReason.PROVIDER_RESPONSE_TIMEOUT);
            booking.setTerminationReason("Quá hạn phản hồi của Nhà cung cấp (30 phút hoặc sát giờ hẹn)");
            booking.setTerminatedAt(now);
            booking.setTerminationActorType(ActorType.SYSTEM);
            throw new BusinessException("Yêu cầu đặt lịch đã quá hạn phản hồi của Nhà cung cấp.");
        }

        // 7. Check provider availability: must have AVAILABLE slot covering [startsAt, endsAt] and not BLOCKED
        boolean isCovered = providerAvailabilityRepository.isCoveredByAvailableSlot(
                providerAccountId, booking.getStartsAt(), booking.getEndsAt()
        );
        if (!isCovered) {
            throw new BusinessException("Nhà cung cấp không mở lịch làm việc trong khung giờ này.");
        }

        boolean hasBlocked = providerAvailabilityRepository.hasBlockedOverlap(
                providerAccountId, booking.getStartsAt(), booking.getEndsAt()
        );
        if (hasBlocked) {
            throw new BusinessException("Khung giờ này đã bị khóa trong lịch làm việc của Nhà cung cấp.");
        }

        // 8. Auto-release any overdue PENDING_DEPOSIT holds for this provider overlapping [startsAt, endsAt] (UC 51)
        bookingExpirationService.releaseOverdueHoldSlots(
                providerAccountId, booking.getStartsAt(), booking.getEndsAt(), now
        );

        // Check competing bookings: no other booking already holding exclusive slot (PENDING_DEPOSIT, CONFIRMED, IN_PROGRESS)
        Optional<Booking> conflict = bookingRepository.findFirstOverlappingExclusiveBookingExcluding(
                providerAccountId, booking.getStartsAt(), booking.getEndsAt(), bookingId, now
        );
        if (conflict.isPresent()) {
            Booking conflictBooking = conflict.get();
            throw new DataConflictException("Không thể chấp nhận đơn vì khung giờ này đã có đơn đặt lịch "
                    + conflictBooking.getBookingCode() + " đang giữ chỗ hoặc đã xác nhận.");
        }

        // 9. Update booking to PENDING_DEPOSIT
        booking.setStatus(BookingStatus.PENDING_DEPOSIT);
        booking.setAcceptedAt(now);
        booking.setDepositDueAt(policyProperties.calculateDepositDueAt(now, booking.getStartsAt()));

        Booking savedBooking = bookingRepository.save(booking);

        // 10. Record status history
        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(savedBooking);
        history.setFromStatus(BookingStatus.PENDING_PROVIDER);
        history.setToStatus(BookingStatus.PENDING_DEPOSIT);
        history.setActorType(ActorType.PROVIDER);
        history.setActorAccount(providerAccount);
        history.setReasonCode("PROVIDER_ACCEPTED");
        history.setNote("Nhà cung cấp chấp nhận đơn đặt lịch");
        historyRepository.save(history);

        return bookingMapper.toDetailResponse(savedBooking);
    }

    @Transactional
    public BookingDetailResponse rejectBookingByProvider(Long providerAccountId, Long bookingId, RejectBookingRequest request) {
        // 1. Validate request and reason
        if (request == null || request.getReason() == null || request.getReason().trim().isEmpty()) {
            throw new BusinessException("Lý do từ chối không được để trống.");
        }
        String trimmedReason = request.getReason().trim();
        if (trimmedReason.length() > 500) {
            throw new BusinessException("Lý do từ chối tối đa 500 ký tự.");
        }

        // 2. Validate provider account
        Account providerAccount = accountRepository.findById(providerAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin nhà cung cấp: " + providerAccountId));

        if (providerAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Tài khoản nhà cung cấp chưa được kích hoạt hoặc đã bị khóa.");
        }

        // 3. Find booking
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt lịch: " + bookingId));

        // 4. Ownership check: Must be the provider assigned to this booking
        if (booking.getProvider() == null || !booking.getProvider().getAccountId().equals(providerAccountId)) {
            throw new AccessDeniedException("Bạn không có quyền thao tác trên đơn đặt lịch của nhà cung cấp khác.");
        }

        // 5. Optimistic locking check
        if (request.getVersion() != null && !request.getVersion().equals(booking.getVersion())) {
            throw new DataConflictException("Thông tin đơn đặt lịch đã bị thay đổi đồng thời. Vui lòng tải lại trang và thử lại.");
        }

        Instant now = Instant.now();

        // 6. Current status check: Must be PENDING_PROVIDER
        if (booking.getStatus() != BookingStatus.PENDING_PROVIDER) {
            throw new BusinessException("Đơn đặt lịch không ở trạng thái chờ phản hồi: " + booking.getStatus());
        }

        // 7. Deadline check (MD01 / UC 51)
        if (now.isAfter(booking.getRequestExpiresAt())) {
            if (bookingExpirationService != null) {
                bookingExpirationService.expireSingleBookingInNewTransaction(
                        booking.getId(),
                        TerminationReason.PROVIDER_RESPONSE_TIMEOUT,
                        "Quá hạn phản hồi của Nhà cung cấp (30 phút hoặc sát giờ hẹn)",
                        now
                );
            }
            booking.setStatus(BookingStatus.EXPIRED);
            booking.setTerminationKind(TerminationKind.EXPIRE);
            booking.setTerminationReasonCode(TerminationReason.PROVIDER_RESPONSE_TIMEOUT);
            booking.setTerminationReason("Quá hạn phản hồi của Nhà cung cấp (30 phút hoặc sát giờ hẹn)");
            booking.setTerminatedAt(now);
            booking.setTerminationActorType(ActorType.SYSTEM);
            throw new BusinessException("Yêu cầu đặt lịch đã quá hạn phản hồi của Nhà cung cấp.");
        }

        // 8. Update booking to REJECTED
        booking.setStatus(BookingStatus.REJECTED);
        booking.setTerminationKind(TerminationKind.REJECT);
        booking.setTerminationActorType(ActorType.PROVIDER);
        booking.setTerminatedByAccount(providerAccount);
        booking.setTerminationReasonCode(TerminationReason.PROVIDER_REJECT);
        booking.setTerminationReason(trimmedReason);
        booking.setTerminatedAt(now);
        booking.setRefundPercent(booking.getProviderRefundPercent() != null ? booking.getProviderRefundPercent() : 100);

        Booking savedBooking = bookingRepository.save(booking);

        // 9. Record status history
        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(savedBooking);
        history.setFromStatus(BookingStatus.PENDING_PROVIDER);
        history.setToStatus(BookingStatus.REJECTED);
        history.setActorType(ActorType.PROVIDER);
        history.setActorAccount(providerAccount);
        history.setReasonCode(TerminationReason.PROVIDER_REJECT.name());
        history.setNote(trimmedReason);
        historyRepository.save(history);

        return bookingMapper.toDetailResponse(savedBooking);
    }

    @Transactional
    public BookingDetailResponse cancelBookingByProvider(Long providerAccountId, Long bookingId, ProviderCancelBookingRequest request) {
        // 1. Validate request and reason
        if (request == null || request.getReason() == null || request.getReason().trim().isEmpty()) {
            throw new BusinessException("Lý do hủy đơn không được để trống.");
        }
        String trimmedReason = request.getReason().trim();
        if (trimmedReason.length() < 5 || trimmedReason.length() > 500) {
            throw new BusinessException("Lý do hủy đơn phải từ 5 đến 500 ký tự.");
        }

        // 2. Validate provider account
        Account providerAccount = accountRepository.findById(providerAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin nhà cung cấp: " + providerAccountId));

        if (providerAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Tài khoản nhà cung cấp chưa được kích hoạt hoặc đã bị khóa.");
        }

        // 3. Find booking
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt lịch: " + bookingId));

        // 4. Ownership check: Must be the provider assigned to this booking
        if (booking.getProvider() == null || !booking.getProvider().getAccountId().equals(providerAccountId)) {
            throw new AccessDeniedException("Bạn không có quyền thao tác trên đơn đặt lịch của nhà cung cấp khác.");
        }

        // 5. Optimistic locking check
        if (request.getVersion() != null && !request.getVersion().equals(booking.getVersion())) {
            throw new DataConflictException("Thông tin đơn đặt lịch đã bị thay đổi đồng thời. Vui lòng tải lại trang và thử lại.");
        }

        BookingStatus currentStatus = booking.getStatus();
        Instant now = Instant.now();
        int refundPercent = booking.getProviderRefundPercent() != null ? booking.getProviderRefundPercent() : 100;
        long refundDueVnd = 0L;

        // 6. Current status & Timing checks
        switch (currentStatus) {
            case PENDING_DEPOSIT -> {
                // Endpoint Lazy Check (MD01 / UC 51): Kiem tra deadline giu cho coc
                if (booking.getDepositDueAt() != null && !now.isBefore(booking.getDepositDueAt())) {
                    if (bookingExpirationService != null) {
                        bookingExpirationService.expireSingleBookingInNewTransaction(
                                booking.getId(),
                                TerminationReason.DEPOSIT_TIMEOUT,
                                "Quá thời hạn giữ chỗ chờ thanh toán cọc (15 phút hoặc sát giờ hẹn)",
                                now
                        );
                    }
                    booking.setStatus(BookingStatus.EXPIRED);
                    booking.setTerminationKind(TerminationKind.EXPIRE);
                    booking.setTerminationReasonCode(TerminationReason.DEPOSIT_TIMEOUT);
                    booking.setTerminationReason("Quá thời hạn giữ chỗ chờ thanh toán cọc (15 phút hoặc sát giờ hẹn)");
                    booking.setTerminatedAt(now);
                    booking.setTerminationActorType(ActorType.SYSTEM);
                    throw new BusinessException("Đơn đặt lịch đã quá thời hạn giữ chỗ chờ thanh toán cọc và đã kết thúc (EXPIRED).");
                }
                refundDueVnd = 0L;
            }
            case CONFIRMED -> {
                // Đã thu cọc -> hoàn 100% cọc cho khách
                refundDueVnd = booking.getDepositAmountVnd() != null ? booking.getDepositAmountVnd() : 0L;
                final long finalRefundDueVnd = refundDueVnd;
                if (paymentTransactionRepository != null && finalRefundDueVnd > 0) {
                    Optional<PaymentTransaction> depositTx = paymentTransactionRepository
                            .findFirstByBookingIdAndKindAndStatusOrderByCreatedAtDesc(
                                    bookingId, PaymentKind.DEPOSIT, PaymentStatus.SUCCEEDED
                            );
                    depositTx.ifPresent(tx -> {
                        tx.setRefundDueVnd(finalRefundDueVnd);
                        tx.setRefundReason(RefundReason.CANCEL_POLICY);
                        paymentTransactionRepository.save(tx);
                    });
                }
            }
            case PENDING_PROVIDER -> throw new BusinessException("Đơn đặt lịch đang chờ phản hồi. Vui lòng sử dụng tính năng từ chối đơn đặt lịch thay vì hủy đơn.");
            case IN_PROGRESS -> throw new BusinessException("Không thể tự hủy khi dịch vụ đang được thực hiện (IN_PROGRESS). Vui lòng liên hệ Quản trị viên để được hỗ trợ xử lý sự cố.");
            case COMPLETED -> throw new BusinessException("Không thể hủy đơn đặt lịch đã hoàn thành.");
            case CANCELLED, REJECTED, EXPIRED -> throw new BusinessException("Đơn đặt lịch đã kết thúc trước đó.");
            default -> throw new BusinessException("Trạng thái đơn không hợp lệ để hủy: " + currentStatus);
        }

        // 7. Update Booking
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setTerminationKind(TerminationKind.CANCEL);
        booking.setTerminationActorType(ActorType.PROVIDER);
        booking.setTerminatedByAccount(providerAccount);
        booking.setTerminationReasonCode(TerminationReason.PROVIDER_CANCEL);
        booking.setTerminationReason(trimmedReason);
        booking.setTerminatedAt(now);
        booking.setRefundPercent(refundPercent);

        Booking savedBooking = bookingRepository.save(booking);

        // 8. Record Status History
        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(savedBooking);
        history.setFromStatus(currentStatus);
        history.setToStatus(BookingStatus.CANCELLED);
        history.setActorType(ActorType.PROVIDER);
        history.setActorAccount(providerAccount);
        history.setReasonCode(TerminationReason.PROVIDER_CANCEL.name());
        history.setNote(trimmedReason);
        historyRepository.save(history);

        return bookingMapper.toDetailResponse(savedBooking);
    }

    @Transactional
    public BookingDetailResponse startServiceByProvider(Long providerAccountId, Long bookingId, StartServiceRequest request) {
        // 1. Validate provider account
        Account providerAccount = accountRepository.findById(providerAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin nhà cung cấp: " + providerAccountId));

        if (providerAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Tài khoản nhà cung cấp chưa được kích hoạt hoặc đã bị khóa.");
        }

        // 2. Find booking
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt lịch: " + bookingId));

        // 3. Ownership check: Must be the provider assigned to this booking
        if (booking.getProvider() == null || !booking.getProvider().getAccountId().equals(providerAccountId)) {
            throw new AccessDeniedException("Bạn không có quyền thao tác trên đơn đặt lịch của nhà cung cấp khác.");
        }

        // 4. Optimistic locking check
        if (request != null && request.getVersion() != null && !request.getVersion().equals(booking.getVersion())) {
            throw new DataConflictException("Thông tin đơn đặt lịch đã bị thay đổi đồng thời. Vui lòng tải lại trang và thử lại.");
        }

        // 5. Status check: Must be CONFIRMED (BR-UC22-02)
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BusinessException("Đơn đặt lịch không ở trạng thái đã xác nhận (CONFIRMED): " + booking.getStatus());
        }

        Instant now = Instant.now();

        // 6. Timing check: Must start at or after startsAt (BR-UC22-03)
        if (now.isBefore(booking.getStartsAt())) {
            throw new BusinessException("Chưa đến giờ hẹn thực hiện dịch vụ. Đơn đặt lịch chỉ có thể bắt đầu từ: " + booking.getStartsAt());
        }

        // 7. Concurrent check: No other booking currently IN_PROGRESS for this provider (BR-UC22-04)
        Optional<Booking> concurrentInProgress = bookingRepository.findFirstByProviderIdAndStatusExcluding(
                providerAccountId, BookingStatus.IN_PROGRESS, bookingId
        );
        if (concurrentInProgress.isPresent()) {
            throw new DataConflictException("Nhà cung cấp đang có đơn đặt lịch "
                    + concurrentInProgress.get().getBookingCode() + " đang được thực hiện. Vui lòng hoàn thành đơn hiện tại trước khi bắt đầu đơn mới.");
        }

        // 8. Update booking to IN_PROGRESS
        booking.setStatus(BookingStatus.IN_PROGRESS);
        booking.setStartedAt(now);

        Booking savedBooking = bookingRepository.save(booking);

        // 9. Record status history
        String noteText = (request != null && request.getNote() != null && !request.getNote().trim().isEmpty())
                ? request.getNote().trim()
                : "Nhà cung cấp bắt đầu thực hiện dịch vụ";

        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(savedBooking);
        history.setFromStatus(BookingStatus.CONFIRMED);
        history.setToStatus(BookingStatus.IN_PROGRESS);
        history.setActorType(ActorType.PROVIDER);
        history.setActorAccount(providerAccount);
        history.setReasonCode("PROVIDER_STARTED");
        history.setNote(noteText);
        historyRepository.save(history);

        return bookingMapper.toDetailResponse(savedBooking);
    }

    @Transactional
    public BookingDetailResponse completeServiceByProvider(Long providerAccountId, Long bookingId, CompleteServiceRequest request) {
        // 1. Validate provider account
        Account providerAccount = accountRepository.findById(providerAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin nhà cung cấp: " + providerAccountId));

        if (providerAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Tài khoản nhà cung cấp chưa được kích hoạt hoặc đã bị khóa.");
        }

        // 2. Find booking
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt lịch: " + bookingId));


        // 3. Ownership check: Must be the provider assigned to this booking
        if (booking.getProvider() == null || !booking.getProvider().getAccountId().equals(providerAccountId)) {
            throw new AccessDeniedException("Bạn không có quyền thao tác trên đơn đặt lịch của nhà cung cấp khác.");
        }

        // 4. Optimistic locking check
        if (request != null && request.getVersion() != null && !request.getVersion().equals(booking.getVersion())) {
            throw new DataConflictException("Thông tin đơn đặt lịch đã bị thay đổi đồng thời. Vui lòng tải lại trang và thử lại.");
        }

        // 5. Status check: Must be IN_PROGRESS (BR-UC22-05)
        if (booking.getStatus() != BookingStatus.IN_PROGRESS) {
            throw new BusinessException("Đơn đặt lịch không ở trạng thái đang thực hiện (IN_PROGRESS): " + booking.getStatus());
        }

        Instant now = Instant.now();

        // 6. Timing check: completedAt must not be before startedAt (BR-UC22-06)
        if (booking.getStartedAt() != null && now.isBefore(booking.getStartedAt())) {
            throw new BusinessException("Thời điểm hoàn thành không thể trước thời điểm bắt đầu dịch vụ.");
        }

        // 7. Update booking to COMPLETED and activate balance_due_at (24h) (BR-UC22-07, BR-UC22-08)
        booking.setStatus(BookingStatus.COMPLETED);
        booking.setCompletedAt(now);
        booking.setBalanceDueAt(policyProperties.calculateBalanceDueAt(now));

        Booking savedBooking = bookingRepository.save(booking);

        // 8. Record status history
        String noteText = (request != null && request.getNote() != null && !request.getNote().trim().isEmpty())
                ? request.getNote().trim()
                : "Nhà cung cấp xác nhận hoàn thành dịch vụ";

        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(savedBooking);
        history.setFromStatus(BookingStatus.IN_PROGRESS);
        history.setToStatus(BookingStatus.COMPLETED);
        history.setActorType(ActorType.PROVIDER);
        history.setActorAccount(providerAccount);
        history.setReasonCode("PROVIDER_COMPLETED");
        history.setNote(noteText);
        historyRepository.save(history);

        return bookingMapper.toDetailResponse(savedBooking);
    }

    private String generateBookingCode() {
        String datePart = DateTimeFormatter.ofPattern("yyyyMMdd")
                .withZone(ZoneOffset.UTC)
                .format(Instant.now());
        for (int i = 0; i < 10; i++) {
            String randomPart = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            String code = "BK-" + datePart + "-" + randomPart;
            if (!bookingRepository.existsByBookingCode(code)) {
                return code;
            }
        }
        return "BK-" + datePart + "-" + System.currentTimeMillis();
    }
}
