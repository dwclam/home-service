package com.homeservice.booking.mapper;

import com.homeservice.booking.dto.response.BookingHistoryItemResponse;
import com.homeservice.booking.dto.response.BookingPaymentSummaryResponse;
import com.homeservice.booking.dto.response.BookingViewDetailResponse;
import com.homeservice.booking.dto.response.ProviderBookingListItemResponse;
import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.entity.BookingStatusHistory;
import com.homeservice.payment.entity.PaymentTransaction;
import com.homeservice.payment.enums.PaymentAllocationStatus;
import com.homeservice.payment.enums.PaymentKind;
import com.homeservice.payment.enums.PaymentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class BookingViewMapper {

    // Mapper của Thuỷ, dùng lại để dựng phần chi tiết cơ bản
    private final BookingMapper bookingMapper;

    // Đơn -> một dòng trong danh sách đơn được giao của NCC (UC40)
    public ProviderBookingListItemResponse toProviderListItem(Booking b) {
        ProviderBookingListItemResponse r = new ProviderBookingListItemResponse();
        r.setId(b.getId());
        r.setVersion(b.getVersion());
        r.setBookingCode(b.getBookingCode());
        r.setServiceTitle(b.getServiceTitleSnapshot());
        r.setRecipientName(b.getRecipientName());
        r.setCity(b.getCity());
        r.setStartsAt(b.getStartsAt());
        r.setEndsAt(b.getEndsAt());
        r.setStatus(b.getStatus());
        r.setTotalAmountVnd(b.getTotalAmountVnd());
        r.setRequestExpiresAt(b.getRequestExpiresAt());
        r.setCreatedAt(b.getCreatedAt());
        return r;
    }

    // Một dòng lịch sử trạng thái (không lộ tài khoản người thao tác)
    public BookingHistoryItemResponse toHistoryItem(BookingStatusHistory h) {
        BookingHistoryItemResponse r = new BookingHistoryItemResponse();
        r.setFromStatus(h.getFromStatus());
        r.setToStatus(h.getToStatus());
        r.setActorType(h.getActorType());
        r.setReasonCode(h.getReasonCode());
        r.setNote(h.getNote());
        r.setCreatedAt(h.getCreatedAt());
        return r;
    }

    // Danh sách giao dịch của đơn -> tóm tắt tiền cho khách
    public BookingPaymentSummaryResponse toPaymentSummary(List<PaymentTransaction> payments) {
        long paid = 0L;
        long refundDue = 0L;
        boolean depositPaid = false;
        boolean balancePaid = false;
        boolean unresolved = false;

        for (PaymentTransaction p : payments) {
            if (p.getStatus() == PaymentStatus.SUCCEEDED) {
                if (p.getReceivedAmountVnd() != null) {
                    paid += p.getReceivedAmountVnd();
                }
                if (p.getRefundDueVnd() != null) {
                    refundDue += p.getRefundDueVnd();
                }
                // Khoản thu hợp lệ đã áp vào nghĩa vụ cọc hoặc phần còn lại
                if (p.getAllocationStatus() == PaymentAllocationStatus.APPLIED) {
                    if (p.getKind() == PaymentKind.DEPOSIT) {
                        depositPaid = true;
                    } else if (p.getKind() == PaymentKind.BALANCE) {
                        balancePaid = true;
                    }
                }
            } else if (p.getStatus() == PaymentStatus.PENDING || p.getStatus() == PaymentStatus.UNKNOWN) {
                // Còn giao dịch chưa rõ kết quả nên chưa xác định được số cần hoàn
                unresolved = true;
            }
        }

        BookingPaymentSummaryResponse r = new BookingPaymentSummaryResponse();
        r.setPaidAmountVnd(paid);
        r.setRefundDueVnd(unresolved ? null : refundDue);
        r.setDepositPaid(depositPaid);
        r.setBalancePaid(balancePaid);
        return r;
    }

    // Ghép chi tiết: phần cơ bản của Thuỷ + tóm tắt tiền + lịch sử trạng thái
    public BookingViewDetailResponse toViewDetail(Booking booking,
                                                  List<BookingStatusHistory> history,
                                                  BookingPaymentSummaryResponse paymentSummary) {
        BookingViewDetailResponse r = new BookingViewDetailResponse();
        // Chép toàn bộ trường của BookingDetailResponse sang bản kế thừa
        BeanUtils.copyProperties(bookingMapper.toDetailResponse(booking), r);
        r.setPaymentSummary(paymentSummary);
        r.setHistory(history.stream().map(this::toHistoryItem).toList());
        return r;
    }
}
