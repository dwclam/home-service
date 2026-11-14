package com.homeservice.provider.service;

import com.homeservice.account.enums.AccountStatus;
import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.repository.BookingRepository;
import com.homeservice.common.exception.BusinessException;
import com.homeservice.common.exception.DataConflictException;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.provider.dto.request.BatchAvailabilityRequest;
import com.homeservice.provider.dto.request.CreateAvailabilitySlotRequest;
import com.homeservice.provider.dto.request.UpdateAvailabilitySlotRequest;
import com.homeservice.provider.dto.response.AvailabilitySlotResponse;
import com.homeservice.provider.entity.ProviderAvailability;
import com.homeservice.provider.entity.ProviderProfile;
import com.homeservice.provider.enums.AvailabilityState;
import com.homeservice.provider.mapper.ProviderAvailabilityMapper;
import com.homeservice.provider.repository.ProviderAvailabilityRepository;
import com.homeservice.provider.repository.ProviderProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProviderAvailabilityService {

    private final ProviderAvailabilityRepository providerAvailabilityRepository;
    private final ProviderProfileRepository providerProfileRepository;
    private final BookingRepository bookingRepository;
    private final ProviderAvailabilityMapper availabilityMapper;

    @Transactional(readOnly = true)
    public List<AvailabilitySlotResponse> getAvailabilitySlots(Long providerId, Instant from, Instant to) {
        if (providerId == null) {
            throw new BusinessException("Provider ID không được để trống.");
        }

        ProviderProfile provider = providerProfileRepository.findById(providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin nhà cung cấp"));

        Instant searchFrom = from != null ? from : Instant.now();
        Instant searchTo = to != null ? to : searchFrom.plus(30, ChronoUnit.DAYS);

        if (searchFrom.isAfter(searchTo)) {
            throw new BusinessException("Thời gian bắt đầu tìm kiếm phải trước thời gian kết thúc.");
        }

        List<ProviderAvailability> slots = providerAvailabilityRepository.findSlotsInRange(providerId, searchFrom, searchTo);
        return availabilityMapper.toResponseList(slots);
    }

    @Transactional
    public AvailabilitySlotResponse createSlot(Long providerId, CreateAvailabilitySlotRequest request) {
        if (providerId == null) {
            throw new BusinessException("Provider ID không được để trống.");
        }
        if (request == null) {
            throw new BusinessException("Dữ liệu yêu cầu không được để trống.");
        }

        validateSlotTimes(request.getStartsAt(), request.getEndsAt());

        ProviderProfile provider = providerProfileRepository.findById(providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin nhà cung cấp"));
        validateProviderActive(provider);

        if (request.getState() == AvailabilityState.BLOCKED) {
            return createBlockedSlot(provider, request.getStartsAt(), request.getEndsAt());
        } else {
            return createAvailableSlot(provider, request.getStartsAt(), request.getEndsAt());
        }
    }

    @Transactional
    public List<AvailabilitySlotResponse> createBatchSlots(Long providerId, BatchAvailabilityRequest request) {
        if (request == null || request.getSlots() == null || request.getSlots().isEmpty()) {
            throw new BusinessException("Danh sách khung giờ không được để trống.");
        }

        List<AvailabilitySlotResponse> responses = new ArrayList<>();
        for (CreateAvailabilitySlotRequest slotRequest : request.getSlots()) {
            responses.add(createSlot(providerId, slotRequest));
        }
        return responses;
    }

    @Transactional
    public AvailabilitySlotResponse updateSlot(Long providerId, Long slotId, UpdateAvailabilitySlotRequest request) {
        if (providerId == null || slotId == null) {
            throw new BusinessException("Provider ID và Slot ID không được để trống.");
        }
        if (request == null) {
            throw new BusinessException("Dữ liệu yêu cầu không được để trống.");
        }

        validateSlotTimes(request.getStartsAt(), request.getEndsAt());

        ProviderAvailability slot = providerAvailabilityRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khung lịch"));

        if (!slot.getProvider().getAccountId().equals(providerId)) {
            throw new AccessDeniedException("Bạn không có quyền thao tác trên lịch của nhà cung cấp khác");
        }
        validateProviderActive(slot.getProvider());

        // Check if modifying an AVAILABLE slot would orphan any active bookings
        if (slot.getState() == AvailabilityState.AVAILABLE) {
            Optional<Booking> orphanedBooking = bookingRepository.findOrphanedBookingIfSlotRemoved(
                    providerId, slot.getStartsAt(), slot.getEndsAt(), slotId, Instant.now()
            );
            if (orphanedBooking.isPresent()) {
                Booking booking = orphanedBooking.get();
                boolean stillCovered = request.getState() == AvailabilityState.AVAILABLE
                        && request.getStartsAt().compareTo(booking.getStartsAt()) <= 0
                        && request.getEndsAt().compareTo(booking.getEndsAt()) >= 0;
                if (!stillCovered) {
                    throw new BusinessException("Không thể cập nhật hoặc thu hẹp khung giờ làm việc vì đơn đặt lịch "
                            + booking.getBookingCode() + " đang được lên lịch trong khoảng thời gian này.");
                }
            }
        }

        // If new state is BLOCKED, check collision with active bookings
        if (request.getState() == AvailabilityState.BLOCKED) {
            Optional<Booking> conflictBooking = bookingRepository.findFirstOverlappingExclusiveBooking(
                    providerId, request.getStartsAt(), request.getEndsAt(), Instant.now()
            );
            if (conflictBooking.isPresent()) {
                Booking booking = conflictBooking.get();
                throw new DataConflictException("Không thể khóa lịch trong khung giờ này vì đã có đơn đặt lịch "
                        + booking.getBookingCode() + " đang giữ chỗ hoặc đã xác nhận. Nếu không thể phục vụ, vui lòng vào đơn hàng để thực hiện hủy đơn.");
            }
        }

        slot.setStartsAt(request.getStartsAt());
        slot.setEndsAt(request.getEndsAt());
        slot.setState(request.getState());

        // Auto-merge with other abutting or overlapping slots of the same state
        List<ProviderAvailability> overlappingOrAbutting = providerAvailabilityRepository
                .findOverlappingOrAbuttingSlotsExcluding(
                        providerId, slotId, request.getState(), request.getStartsAt(), request.getEndsAt()
                );

        if (!overlappingOrAbutting.isEmpty()) {
            Instant mergedStart = slot.getStartsAt();
            Instant mergedEnd = slot.getEndsAt();
            for (ProviderAvailability item : overlappingOrAbutting) {
                if (item.getStartsAt().isBefore(mergedStart)) {
                    mergedStart = item.getStartsAt();
                }
                if (item.getEndsAt().isAfter(mergedEnd)) {
                    mergedEnd = item.getEndsAt();
                }
            }
            slot.setStartsAt(mergedStart);
            slot.setEndsAt(mergedEnd);
            providerAvailabilityRepository.deleteAll(overlappingOrAbutting);
        }

        return availabilityMapper.toResponse(providerAvailabilityRepository.save(slot));
    }

    @Transactional
    public void deleteSlot(Long providerId, Long slotId) {
        if (providerId == null || slotId == null) {
            throw new BusinessException("Provider ID và Slot ID không được để trống.");
        }

        ProviderAvailability slot = providerAvailabilityRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khung lịch"));

        if (!slot.getProvider().getAccountId().equals(providerId)) {
            throw new AccessDeniedException("Bạn không có quyền thao tác trên lịch của nhà cung cấp khác");
        }
        validateProviderActive(slot.getProvider());

        if (slot.getState() == AvailabilityState.AVAILABLE) {
            Optional<Booking> orphanedBooking = bookingRepository.findOrphanedBookingIfSlotRemoved(
                    providerId, slot.getStartsAt(), slot.getEndsAt(), slotId, Instant.now()
            );
            if (orphanedBooking.isPresent()) {
                Booking booking = orphanedBooking.get();
                throw new BusinessException("Không thể xóa khung giờ làm việc vì đơn đặt lịch "
                        + booking.getBookingCode() + " đang được lên lịch trong khoảng thời gian này.");
            }
        }

        providerAvailabilityRepository.delete(slot);
    }

    private AvailabilitySlotResponse createBlockedSlot(ProviderProfile provider, Instant startsAt, Instant endsAt) {
        Long providerId = provider.getAccountId();
        Optional<Booking> conflictBooking = bookingRepository.findFirstOverlappingExclusiveBooking(
                providerId, startsAt, endsAt, Instant.now()
        );
        if (conflictBooking.isPresent()) {
            Booking booking = conflictBooking.get();
            throw new DataConflictException("Không thể khóa lịch trong khung giờ này vì đã có đơn đặt lịch "
                    + booking.getBookingCode() + " đang giữ chỗ hoặc đã xác nhận. Nếu không thể phục vụ, vui lòng vào đơn hàng để thực hiện hủy đơn.");
        }

        List<ProviderAvailability> overlapping = providerAvailabilityRepository
                .findOverlappingOrAbuttingSlots(providerId, AvailabilityState.BLOCKED, startsAt, endsAt);

        if (overlapping.isEmpty()) {
            ProviderAvailability slot = new ProviderAvailability();
            slot.setProvider(provider);
            slot.setStartsAt(startsAt);
            slot.setEndsAt(endsAt);
            slot.setState(AvailabilityState.BLOCKED);
            return availabilityMapper.toResponse(providerAvailabilityRepository.save(slot));
        }

        Instant mergedStart = startsAt;
        Instant mergedEnd = endsAt;
        for (ProviderAvailability item : overlapping) {
            if (item.getStartsAt().isBefore(mergedStart)) {
                mergedStart = item.getStartsAt();
            }
            if (item.getEndsAt().isAfter(mergedEnd)) {
                mergedEnd = item.getEndsAt();
            }
        }

        ProviderAvailability primary = overlapping.get(0);
        primary.setStartsAt(mergedStart);
        primary.setEndsAt(mergedEnd);
        if (overlapping.size() > 1) {
            providerAvailabilityRepository.deleteAll(overlapping.subList(1, overlapping.size()));
        }
        return availabilityMapper.toResponse(providerAvailabilityRepository.save(primary));
    }

    private AvailabilitySlotResponse createAvailableSlot(ProviderProfile provider, Instant startsAt, Instant endsAt) {
        Long providerId = provider.getAccountId();
        List<ProviderAvailability> overlapping = providerAvailabilityRepository
                .findOverlappingOrAbuttingSlots(providerId, AvailabilityState.AVAILABLE, startsAt, endsAt);

        if (overlapping.isEmpty()) {
            ProviderAvailability slot = new ProviderAvailability();
            slot.setProvider(provider);
            slot.setStartsAt(startsAt);
            slot.setEndsAt(endsAt);
            slot.setState(AvailabilityState.AVAILABLE);
            return availabilityMapper.toResponse(providerAvailabilityRepository.save(slot));
        }

        Instant mergedStart = startsAt;
        Instant mergedEnd = endsAt;
        for (ProviderAvailability item : overlapping) {
            if (item.getStartsAt().isBefore(mergedStart)) {
                mergedStart = item.getStartsAt();
            }
            if (item.getEndsAt().isAfter(mergedEnd)) {
                mergedEnd = item.getEndsAt();
            }
        }

        ProviderAvailability primary = overlapping.get(0);
        primary.setStartsAt(mergedStart);
        primary.setEndsAt(mergedEnd);
        if (overlapping.size() > 1) {
            providerAvailabilityRepository.deleteAll(overlapping.subList(1, overlapping.size()));
        }
        return availabilityMapper.toResponse(providerAvailabilityRepository.save(primary));
    }

    private void validateSlotTimes(Instant startsAt, Instant endsAt) {
        if (startsAt == null || endsAt == null) {
            throw new BusinessException("Thời gian bắt đầu và kết thúc không được để trống.");
        }
        if (!endsAt.isAfter(startsAt)) {
            throw new BusinessException("Thời gian kết thúc phải lớn hơn thời gian bắt đầu.");
        }
        if (!endsAt.isAfter(Instant.now())) {
            throw new BusinessException("Thời gian kết thúc phải ở tương lai.");
        }
    }

    private void validateProviderActive(ProviderProfile provider) {
        if (provider.getAccount() != null && provider.getAccount().getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Tài khoản nhà cung cấp chưa được kích hoạt hoặc đã bị khóa.");
        }
    }
}
