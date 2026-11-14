package com.homeservice.booking.service;

import com.homeservice.booking.dto.request.AdminBookingSearchFilter;
import com.homeservice.booking.dto.response.AdminBookingSummaryResponse;
import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.mapper.AdminBookingMapper;
import com.homeservice.booking.repository.BookingRepository;
import com.homeservice.booking.repository.specification.BookingSpecification;
import com.homeservice.common.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Service xử lý nghiệp vụ quản trị đơn đặt lịch cho Admin (UC 31).
 */
@Service
@RequiredArgsConstructor
public class AdminBookingService {

    private final BookingRepository bookingRepository;
    private final AdminBookingMapper adminBookingMapper;

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "createdAt", "startsAt", "totalAmountVnd", "status", "id"
    );

    /**
     * Tra cứu danh sách đơn toàn hệ thống kèm phân trang và lọc đa tiêu chí (UC 31).
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
}
