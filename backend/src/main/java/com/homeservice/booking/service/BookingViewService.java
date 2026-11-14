package com.homeservice.booking.service;

import com.homeservice.booking.dto.request.BookingListRequest;
import com.homeservice.booking.dto.response.BookingPaymentSummaryResponse;
import com.homeservice.booking.dto.response.BookingResponse;
import com.homeservice.booking.dto.response.BookingViewDetailResponse;
import com.homeservice.booking.dto.response.ProviderBookingListItemResponse;
import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.entity.BookingStatusHistory;
import com.homeservice.booking.mapper.BookingMapper;
import com.homeservice.booking.mapper.BookingViewMapper;
import com.homeservice.booking.repository.BookingStatusHistoryRepository;
import com.homeservice.booking.repository.BookingViewRepository;
import com.homeservice.common.dto.PageResponse;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.payment.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// UC10 (khách xem đơn của mình) và UC40 (NCC xem đơn được giao). Chỉ đọc, không sửa đơn
@Service
@RequiredArgsConstructor
public class BookingViewService {

    private final BookingViewRepository bookingViewRepository;
    private final BookingStatusHistoryRepository historyRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final BookingMapper bookingMapper;
    private final BookingViewMapper bookingViewMapper;

    // ===== UC10: khách =====

    // Danh sách đơn của khách, dùng BookingResponse của Thuỷ
    @Transactional(readOnly = true)
    public PageResponse<BookingResponse> listForCustomer(Long customerId, BookingListRequest req) {
        Pageable pageable = toPageable(req);
        Page<Booking> page = (req.getStatus() == null)
                ? bookingViewRepository.findByCustomerId(customerId, pageable)
                : bookingViewRepository.findByCustomerIdAndStatus(customerId, req.getStatus(), pageable);
        return toPageResponse(page.map(bookingMapper::toSummaryResponse));
    }

    // Chi tiết đơn của khách; đơn của người khác coi như không tồn tại (404)
    @Transactional(readOnly = true)
    public BookingViewDetailResponse getForCustomer(Long customerId, Long bookingId) {
        Booking booking = bookingViewRepository.findByIdAndCustomerId(bookingId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt lịch"));

        List<BookingStatusHistory> history = historyRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);
        BookingPaymentSummaryResponse paymentSummary = bookingViewMapper.toPaymentSummary(
                paymentTransactionRepository.findByBookingId(bookingId));

        return bookingViewMapper.toViewDetail(booking, history, paymentSummary);
    }

    // ===== UC40: NCC =====

    // Danh sách đơn được giao cho NCC
    @Transactional(readOnly = true)
    public PageResponse<ProviderBookingListItemResponse> listForProvider(Long providerId, BookingListRequest req) {
        Pageable pageable = toPageable(req);
        Page<Booking> page = (req.getStatus() == null)
                ? bookingViewRepository.findByProviderAccountId(providerId, pageable)
                : bookingViewRepository.findByProviderAccountIdAndStatus(providerId, req.getStatus(), pageable);
        return toPageResponse(page.map(bookingViewMapper::toProviderListItem));
    }

    // Chi tiết đơn được giao; NCC không xem phần tiền thanh toán (paymentSummary để null)
    @Transactional(readOnly = true)
    public BookingViewDetailResponse getForProvider(Long providerId, Long bookingId) {
        Booking booking = bookingViewRepository.findByIdAndProviderAccountId(bookingId, providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt lịch"));

        List<BookingStatusHistory> history = historyRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);
        return bookingViewMapper.toViewDetail(booking, history, null);
    }

    // ===== Hàm dùng chung =====

    // Mới nhất trước; thêm id làm tiêu chí phụ để thứ tự ổn định giữa các trang
    private Pageable toPageable(BookingListRequest req) {
        return PageRequest.of(req.getPage(), req.getSize(),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
    }

    // Đổi Page của Spring sang PageResponse dùng chung của nhóm
    private <T> PageResponse<T> toPageResponse(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}