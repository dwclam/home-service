package com.homeservice.support.service;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.repository.BookingRepository;
import com.homeservice.chat.entity.Conversation;
import com.homeservice.chat.entity.Message;
import com.homeservice.chat.enums.ConversationType;
import com.homeservice.chat.repository.ConversationRepository;
import com.homeservice.chat.repository.MessageRepository;
import com.homeservice.common.exception.BusinessException;
import com.homeservice.common.exception.DataConflictException;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.support.dto.request.CreateComplaintRequest;
import com.homeservice.support.dto.response.CustomerComplaintDetailResponse;
import com.homeservice.support.entity.Complaint;
import com.homeservice.support.enums.ComplaintStatus;
import com.homeservice.support.mapper.ComplaintMapper;
import com.homeservice.support.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Service xử lý nghiệp vụ Hỗ trợ & Khiếu nại (UC 39 & UC 33).
 */
@Service
@RequiredArgsConstructor
public class ComplaintService {

    public static final List<ComplaintStatus> UNRESOLVED_STATUSES = List.of(
            ComplaintStatus.OPEN,
            ComplaintStatus.IN_REVIEW
    );

    private final ComplaintRepository complaintRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final BookingRepository bookingRepository;
    private final AccountRepository accountRepository;
    private final ComplaintMapper complaintMapper;

    /**
     * UC 39 — Khách hàng tạo yêu cầu hỗ trợ / khiếu nại mới.
     * Nguyên tử trong cùng 1 transaction:
     * 1. Xác minh tài khoản CUSTOMER đang ACTIVE (không chặn khách nợ 70% quá hạn theo MD09).
     * 2. Nếu có bookingId: khóa bi quan đơn, kiểm tra IDOR và chặn mở trùng cùng (bookingId, category) đang OPEN/IN_REVIEW.
     * 3. Lưu Complaint (status = OPEN).
     * 4. Lưu Conversation (type = SUPPORT, complaint = savedComplaint, provider = null).
     * 5. Lưu Message đầu tiên (sender = customer, body = description, booking = booking nếu có).
     * 6. Không tự động sửa bookings.settlement_status (MD10 Phương án B).
     */
    @Transactional
    public CustomerComplaintDetailResponse createComplaintByCustomer(
            Long customerId,
            CreateComplaintRequest request
    ) {
        if (request == null || request.getCategory() == null) {
            throw new BusinessException("Danh mục hỗ trợ không được để trống.");
        }

        String trimmedSubject = validateAndTrim(request.getSubject(), 5, 200, "Tiêu đề yêu cầu");
        String trimmedDescription = validateAndTrim(request.getDescription(), 10, 2000, "Nội dung mô tả");

        // 1. Xác minh tài khoản Khách hàng
        Account customerAccount = loadActiveCustomer(customerId);

        // 2. Nếu gắn với đơn hàng: khóa bi quan đơn, kiểm tra IDOR và chống trùng cùng danh mục
        Booking booking = null;
        if (request.getBookingId() != null) {
            booking = bookingRepository.findByIdForUpdate(request.getBookingId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Không tìm thấy đơn đặt lịch với ID: " + request.getBookingId()
                    ));

            if (booking.getCustomer() == null || !booking.getCustomer().getId().equals(customerId)) {
                throw new AccessDeniedException("Bạn không có quyền gửi khiếu nại cho đơn đặt lịch của khách hàng khác.");
            }

            boolean duplicated = complaintRepository.existsByCustomerIdAndBookingIdAndCategoryAndStatusIn(
                    customerId,
                    booking.getId(),
                    request.getCategory(),
                    UNRESOLVED_STATUSES
            );
            if (duplicated) {
                throw new DataConflictException(
                        "Bạn đã có một yêu cầu hỗ trợ cùng danh mục đang được xử lý cho đơn này. Vui lòng trao đổi bổ sung trực tiếp trong yêu cầu đang mở."
                );
            }
        }

        Instant now = Instant.now();

        // 3. Lưu Complaint (OPEN)
        Complaint complaint = new Complaint();
        complaint.setCustomer(customerAccount);
        complaint.setBooking(booking);
        complaint.setAssignedAdmin(null);
        complaint.setCategory(request.getCategory());
        complaint.setSubject(trimmedSubject);
        complaint.setDescription(trimmedDescription);
        complaint.setStatus(ComplaintStatus.OPEN);
        complaint.setResolution(null);
        complaint.setResolvedAt(null);
        complaint.setCreatedAt(now);
        complaint.setUpdatedAt(now);
        Complaint savedComplaint = complaintRepository.saveAndFlush(complaint);

        // 4. Lưu Conversation (type = SUPPORT, complaint_id = savedComplaint.id, provider_id = NULL)
        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.SUPPORT);
        conversation.setCustomer(customerAccount);
        conversation.setProvider(null);
        conversation.setComplaint(savedComplaint);
        conversation.setCreatedAt(now);
        conversation.setUpdatedAt(now);
        Conversation savedConversation = conversationRepository.saveAndFlush(conversation);

        // 5. Lưu Message đầu tiên chứa nội dung ban đầu của yêu cầu hỗ trợ
        Message initialMessage = new Message();
        initialMessage.setConversation(savedConversation);
        initialMessage.setSender(customerAccount);
        initialMessage.setBooking(booking);
        initialMessage.setBody(trimmedDescription);
        initialMessage.setReadAt(null);
        initialMessage.setCreatedAt(now);
        messageRepository.saveAndFlush(initialMessage);

        return complaintMapper.toCustomerDetailResponse(savedComplaint, savedConversation);
    }

    /**
     * Phục vụ MD10 / UC 48 (Đối soát & Chi trả): Kiểm tra đơn hàng có khiếu nại chưa kết thúc hay không.
     */
    @Transactional(readOnly = true)
    public boolean hasUnresolvedComplaintsForBooking(Long bookingId) {
        if (bookingId == null) {
            return false;
        }
        return complaintRepository.existsByBookingIdAndStatusIn(bookingId, UNRESOLVED_STATUSES);
    }

    private Account loadActiveCustomer(Long customerId) {
        if (customerId == null) {
            throw new AccessDeniedException("Không xác định được tài khoản Khách hàng.");
        }
        Account customer = accountRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin khách hàng: " + customerId));

        if (customer.getAccountType() != AccountType.CUSTOMER) {
            throw new AccessDeniedException("Tài khoản không có vai trò Khách hàng.");
        }
        if (customer.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Tài khoản khách hàng chưa được kích hoạt hoặc đã bị khóa.");
        }
        return customer;
    }

    private String validateAndTrim(String value, int min, int max, String fieldLabel) {
        if (value == null || value.trim().isEmpty()) {
            throw new BusinessException(fieldLabel + " không được để trống.");
        }
        String trimmed = value.trim();
        if (trimmed.length() < min || trimmed.length() > max) {
            throw new BusinessException(fieldLabel + " phải từ " + min + " đến " + max + " ký tự.");
        }
        return trimmed;
    }
}
