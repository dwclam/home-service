package com.homeservice.booking.service;

import com.homeservice.account.entity.Account;
import com.homeservice.account.entity.CustomerAddress;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.account.repository.CustomerAddressRepository;
import com.homeservice.booking.dto.request.CreateBookingRequest;
import com.homeservice.booking.dto.response.BookingDetailResponse;
import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.entity.BookingStatusHistory;
import com.homeservice.booking.enums.BookingStatus;
import com.homeservice.booking.enums.SettlementStatus;
import com.homeservice.booking.mapper.BookingMapper;
import com.homeservice.booking.policy.BookingPolicyProperties;
import com.homeservice.booking.repository.BookingRepository;
import com.homeservice.booking.repository.BookingStatusHistoryRepository;
import com.homeservice.catalog.entity.ServiceOffering;
import com.homeservice.catalog.enums.ServiceStatus;
import com.homeservice.catalog.repository.ServiceOfferingRepository;
import com.homeservice.common.enums.ActorType;
import com.homeservice.common.exception.BusinessException;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.provider.entity.ProviderProfile;
import com.homeservice.provider.repository.ProviderAvailabilityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingStatusHistoryRepository historyRepository;
    private final AccountRepository accountRepository;
    private final CustomerAddressRepository customerAddressRepository;
    private final ServiceOfferingRepository serviceOfferingRepository;
    private final ProviderAvailabilityRepository providerAvailabilityRepository;
    private final BookingMapper bookingMapper;
    private final BookingPolicyProperties policyProperties;

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
            throw new BusinessException("Tài khoản Nhà cung cấp hiện đang tạm ngưng hoạt động");
        }

        if (Boolean.TRUE.equals(providerAccount.getMustChangePassword())) {
            throw new BusinessException("Nhà cung cấp chưa hoàn tất kích hoạt tài khoản ban đầu");
        }

        // 5. Lead Time Check: starts_at >= now + leadTimeMinutes (MD01)
        Instant minAllowedStartsAt = now.plus(Duration.ofMinutes(policyProperties.getLeadTimeMinutes()));
        if (request.getStartsAt().isBefore(minAllowedStartsAt)) {
            throw new BusinessException("Thời gian đặt lịch phải cách thời điểm hiện tại ít nhất 60 phút");
        }

        // 6. Availability Check: [starts_at, ends_at)
        int durationMinutes = service.getDurationMinutes();
        Instant startsAt = request.getStartsAt();
        Instant endsAt = startsAt.plus(Duration.ofMinutes(durationMinutes));

        boolean isAvailable = providerAvailabilityRepository.isCoveredByAvailableSlot(
                provider.getAccountId(), startsAt, endsAt
        );
        if (!isAvailable) {
            throw new BusinessException("Nhà cung cấp không mở lịch làm việc trong khung giờ này");
        }

        boolean isBlocked = providerAvailabilityRepository.hasBlockedOverlap(
                provider.getAccountId(), startsAt, endsAt
        );
        if (isBlocked) {
            throw new BusinessException("Khung giờ này đã bị khóa trong lịch của Nhà cung cấp");
        }

        boolean isBusy = bookingRepository.hasOverlappingExclusiveBooking(
                provider.getAccountId(), startsAt, endsAt, now
        );
        if (isBusy) {
            throw new BusinessException("Nhà cung cấp đã có đơn dịch vụ đã xác nhận trong khung giờ này");
        }

        // 7. Address Resolution and Snapshot
        CustomerAddress address = null;
        String recipientName = request.getRecipientName();
        String recipientPhone = request.getRecipientPhone();
        String addressLine = request.getAddressLine();
        String ward = request.getWard();
        String city = request.getCity();
        String addressInstructions = request.getAddressInstructions();

        if (request.getAddressId() != null) {
            address = customerAddressRepository.findByIdAndCustomerId(request.getAddressId(), customerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ trong sổ địa chỉ của bạn"));
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
