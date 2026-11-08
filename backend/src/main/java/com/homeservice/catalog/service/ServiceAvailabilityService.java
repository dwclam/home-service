package com.homeservice.catalog.service;

import com.homeservice.account.enums.AccountStatus;
import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.policy.BookingPolicyProperties;
import com.homeservice.booking.repository.BookingRepository;
import com.homeservice.catalog.dto.AvailableSlotRange;
import com.homeservice.catalog.dto.ServiceAvailableSlotsResponse;
import com.homeservice.catalog.entity.Category;
import com.homeservice.catalog.entity.ServiceOffering;
import com.homeservice.catalog.enums.ServiceStatus;
import com.homeservice.catalog.repository.ServiceOfferingRepository;
import com.homeservice.common.exception.BusinessException;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.provider.entity.ProviderAvailability;
import com.homeservice.provider.entity.ProviderProfile;
import com.homeservice.provider.repository.ProviderAvailabilityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service xử lý nghiệp vụ UC38 — Xem lịch rảnh và giá của nhà cung cấp cho dịch vụ cụ thể.
 * <p>
 * Logic cốt lõi:
 * 1. Khách xem theo gói dịch vụ (biết rõ {@code serviceId}, {@code durationMinutes}, {@code providerId}).
 * 2. Xác thực điều kiện dịch vụ và NCC (PUBLISHED, NCC ACTIVE/visible/mustChangePassword=false, category active).
 * 3. Áp dụng ràng buộc lead-time tối thiểu (MD01: 60 phút từ hiện tại).
 *    Nếu {@code from} không truyền: mặc định = now + 60 phút.
 *    Nếu {@code to} không truyền: mặc định = 1 tuần kể từ now.
 * 4. Lấy các khung giờ AVAILABLE từ {@code provider_availability}.
 * 5. Loại trừ các khoảng thời gian bị chiếm bởi exclusive bookings:
 *    - CONFIRMED
 *    - IN_PROGRESS
 *    - PENDING_DEPOSIT (vẫn còn hạn nộp cọc {@code deposit_due_at > now})
 * 6. Chỉ giữ lại các khoảng rảnh thực tế có độ dài >= {@code durationMinutes}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ServiceAvailabilityService {

    private final ServiceOfferingRepository serviceOfferingRepository;
    private final ProviderAvailabilityRepository providerAvailabilityRepository;
    private final BookingRepository bookingRepository;
    private final BookingPolicyProperties bookingPolicyProperties;
    private final Clock clock;

    /**
     * Tra cứu lịch rảnh khả dụng của dịch vụ trong khoảng [from, to].
     *
     * @param serviceId ID của dịch vụ
     * @param from      Thời điểm bắt đầu tra cứu (nếu null: mặc định now + 60 phút)
     * @param to        Thời điểm kết thúc tra cứu (nếu null: mặc định 1 tuần từ now)
     * @return {@link ServiceAvailableSlotsResponse} chứa thông tin dịch vụ, NCC và danh sách khoảng rảnh
     */
    @Transactional(readOnly = true)
    public ServiceAvailableSlotsResponse getAvailableSlots(Long serviceId, Instant from, Instant to) {
        if (serviceId == null) {
            throw new BusinessException("Mã dịch vụ không được để trống");
        }

        Instant now = Instant.now(clock);
        int leadTimeMinutes = bookingPolicyProperties != null ? bookingPolicyProperties.getLeadTimeMinutes() : 60;
        Instant earliestAllowedStart = now.plus(Duration.ofMinutes(leadTimeMinutes));

        // Mặc định: from = now + 60 phút (đặt lịch cách ít nhất 60 phút)
        if (from == null) {
            from = earliestAllowedStart;
        }

        // Mặc định: to = 1 tuần kể từ from
        if (to == null) {
            to = from.plus(Duration.ofDays(7));
        }

        if (!from.isBefore(to)) {
            throw new BusinessException("Thời điểm bắt đầu phải trước thời điểm kết thúc");
        }
        if (Duration.between(from, to).toDays() > 28) {
            throw new BusinessException("Khoảng thời gian tra cứu tối đa là 28 ngày");
        }

        // 1. Tải dịch vụ và các quan hệ
        ServiceOffering service = serviceOfferingRepository.findByIdWithDetails(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ"));

        // 2. Kiểm tra trạng thái dịch vụ (phải PUBLISHED)
        if (service.getStatus() != ServiceStatus.PUBLISHED) {
            throw new BusinessException("Dịch vụ hiện không khả dụng để đặt lịch");
        }

        // 3. Kiểm tra danh mục
        Category category = service.getCategory();
        if (category == null || !Boolean.TRUE.equals(category.getIsActive())) {
            throw new BusinessException("Danh mục của dịch vụ hiện tạm khóa");
        }

        // 4. Kiểm tra nhà cung cấp và tài khoản
        ProviderProfile provider = service.getProvider();
        if (provider == null) {
            throw new BusinessException("Dịch vụ chưa được gán nhà cung cấp");
        }
        if (!Boolean.TRUE.equals(provider.getIsVisible())) {
            throw new BusinessException("Nhà cung cấp hiện đang tạm ẩn");
        }
        if (provider.getAccount() == null || provider.getAccount().getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Nhà cung cấp hiện không hoạt động");
        }
        if (Boolean.TRUE.equals(provider.getAccount().getMustChangePassword())) {
            throw new BusinessException("Nhà cung cấp chưa hoàn tất thiết lập tài khoản");
        }

        // 5. Chuẩn bị thông tin tóm tắt NCC và phản hồi cơ bản
        ServiceAvailableSlotsResponse.ProviderSummary providerSummary = ServiceAvailableSlotsResponse.ProviderSummary.builder()
                .providerId(provider.getAccountId())
                .businessName(provider.getBusinessName())
                .city(provider.getCity())
                .logoUrl(provider.getLogoUrl())
                .build();

        // 6. Áp dụng quy tắc Lead-time (MD01: tối thiểu 60 phút từ hiện tại)
        // Phạm vi tìm kiếm thực tế: không thể đặt lịch sớm hơn earliestAllowedStart
        Instant searchFrom = from.isAfter(earliestAllowedStart) ? from : earliestAllowedStart;

        // Nếu điểm bắt đầu sau hoặc bằng điểm kết thúc tra cứu, không có khung giờ nào khả dụng
        if (!searchFrom.isBefore(to)) {
            return ServiceAvailableSlotsResponse.builder()
                    .serviceId(service.getId())
                    .serviceTitle(service.getTitle())
                    .durationMinutes(service.getDurationMinutes())
                    .basePriceVnd(service.getBasePriceVnd())
                    .provider(providerSummary)
                    .availableSlots(Collections.emptyList())
                    .build();
        }

        int durationMinutes = service.getDurationMinutes() != null && service.getDurationMinutes() > 0
                ? service.getDurationMinutes()
                : 60;

        // 7. Lấy danh sách slot AVAILABLE của NCC trong [searchFrom, to)
        Long providerId = provider.getAccountId();
        List<ProviderAvailability> rawSlots = providerAvailabilityRepository.findAvailableSlotsInRange(providerId, searchFrom, to);

        // 8. Lấy danh sách exclusive bookings của NCC trong [searchFrom, to)
        List<Booking> exclusiveBookings = bookingRepository.findExclusiveBookingsInRange(providerId, searchFrom, to, now);

        // 9. Tính toán các khoảng rảnh khả dụng sau khi trừ booking
        List<AvailableSlotRange> availableSlots = computeAvailableSlots(
                rawSlots,
                exclusiveBookings,
                searchFrom,
                to,
                durationMinutes
        );

        return ServiceAvailableSlotsResponse.builder()
                .serviceId(service.getId())
                .serviceTitle(service.getTitle())
                .durationMinutes(service.getDurationMinutes())
                .basePriceVnd(service.getBasePriceVnd())
                .provider(providerSummary)
                .availableSlots(availableSlots)
                .build();
    }

    /**
     * Thuật toán trừ khoảng thời gian (Interval Subtraction):
     * - Cắt các slot AVAILABLE theo [searchFrom, searchTo] và gộp các slot chạm/trùng nhau (merge).
     * - Cắt các exclusive booking theo [searchFrom, searchTo] và gộp các booking chạm/trùng nhau.
     * - Duyệt từng khoảng AVAILABLE, trừ đi các khoảng booking giao cắt.
     * - Chỉ giữ lại những khoảng còn lại có độ dài >= durationMinutes.
     */
    private List<AvailableSlotRange> computeAvailableSlots(
            List<ProviderAvailability> rawSlots,
            List<Booking> bookings,
            Instant searchFrom,
            Instant searchTo,
            int durationMinutes
    ) {
        if (rawSlots == null || rawSlots.isEmpty()) {
            return Collections.emptyList();
        }

        // Bước A: Thu gọn slot AVAILABLE vào khung [searchFrom, searchTo] và merge
        List<TimeInterval> mergedAvailable = mergeIntervals(
                rawSlots.stream()
                        .map(s -> new TimeInterval(
                                s.getStartsAt().isAfter(searchFrom) ? s.getStartsAt() : searchFrom,
                                s.getEndsAt().isBefore(searchTo) ? s.getEndsAt() : searchTo
                        ))
                        .filter(i -> i.startsAt.isBefore(i.endsAt))
                        .collect(Collectors.toList())
        );

        if (mergedAvailable.isEmpty()) {
            return Collections.emptyList();
        }

        // Bước B: Thu gọn bookings vào khung [searchFrom, searchTo] và merge
        List<TimeInterval> mergedBookings = bookings == null ? Collections.emptyList() : mergeIntervals(
                bookings.stream()
                        .map(b -> new TimeInterval(
                                b.getStartsAt().isAfter(searchFrom) ? b.getStartsAt() : searchFrom,
                                b.getEndsAt().isBefore(searchTo) ? b.getEndsAt() : searchTo
                        ))
                        .filter(i -> i.startsAt.isBefore(i.endsAt))
                        .collect(Collectors.toList())
        );

        // Bước C: Trừ booking khỏi từng khoảng AVAILABLE
        List<AvailableSlotRange> result = new ArrayList<>();

        for (TimeInterval avail : mergedAvailable) {
            Instant current = avail.startsAt;

            for (TimeInterval book : mergedBookings) {
                // Booking nằm hoàn toàn trước cursor hiện tại hoặc sau khoảng avail
                if (book.endsAt.compareTo(current) <= 0 || book.startsAt.compareTo(avail.endsAt) >= 0) {
                    continue;
                }

                Instant bStart = book.startsAt.isAfter(current) ? book.startsAt : current;
                Instant bEnd = book.endsAt.isBefore(avail.endsAt) ? book.endsAt : avail.endsAt;

                if (current.isBefore(bStart)) {
                    if (Duration.between(current, bStart).toMinutes() >= durationMinutes) {
                        result.add(AvailableSlotRange.builder()
                                .startsAt(current)
                                .endsAt(bStart)
                                .build());
                    }
                }
                if (bEnd.isAfter(current)) {
                    current = bEnd;
                }
            }

            if (current.isBefore(avail.endsAt)) {
                if (Duration.between(current, avail.endsAt).toMinutes() >= durationMinutes) {
                    result.add(AvailableSlotRange.builder()
                            .startsAt(current)
                            .endsAt(avail.endsAt)
                            .build());
                }
            }
        }

        return result;
    }

    /**
     * Gộp các khoảng thời gian giao nhau hoặc tiếp giáp nhau thành các khoảng liên tục.
     */
    private List<TimeInterval> mergeIntervals(List<TimeInterval> intervals) {
        if (intervals == null || intervals.isEmpty()) {
            return Collections.emptyList();
        }

        intervals.sort(Comparator.comparing((TimeInterval i) -> i.startsAt)
                .thenComparing(i -> i.endsAt));

        List<TimeInterval> merged = new ArrayList<>();
        TimeInterval current = intervals.get(0);

        for (int i = 1; i < intervals.size(); i++) {
            TimeInterval next = intervals.get(i);
            // Nếu next tiếp giáp hoặc lấn vào current (next.startsAt <= current.endsAt)
            if (next.startsAt.compareTo(current.endsAt) <= 0) {
                Instant newEnd = next.endsAt.isAfter(current.endsAt) ? next.endsAt : current.endsAt;
                current = new TimeInterval(current.startsAt, newEnd);
            } else {
                merged.add(current);
                current = next;
            }
        }
        merged.add(current);
        return merged;
    }

    private static class TimeInterval {
        final Instant startsAt;
        final Instant endsAt;

        TimeInterval(Instant startsAt, Instant endsAt) {
            this.startsAt = startsAt;
            this.endsAt = endsAt;
        }
    }
}
