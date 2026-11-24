package com.homeservice.support.service;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.repository.BookingRepository;
import com.homeservice.chat.dto.request.SendMessageRequest;
import com.homeservice.chat.dto.response.MessagePageResponse;
import com.homeservice.chat.dto.response.MessageResponse;
import com.homeservice.chat.entity.Conversation;
import com.homeservice.chat.entity.Message;
import com.homeservice.chat.mapper.MessageMapper;
import com.homeservice.chat.repository.ConversationRepository;
import com.homeservice.chat.repository.MessageRepository;
import com.homeservice.common.exception.BusinessException;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.support.entity.Complaint;
import com.homeservice.support.enums.ComplaintStatus;
import com.homeservice.support.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Service xử lý Chat hỗ trợ (Conversation type = SUPPORT) cho Khách hàng (UC 39) và Admin (UC 33).
 */
@Service
@RequiredArgsConstructor
public class SupportChatService {

    private static final int DEFAULT_LIMIT = 30;
    private static final int MAX_LIMIT = 100;

    private final ComplaintRepository complaintRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final BookingRepository bookingRepository;
    private final AccountRepository accountRepository;
    private final MessageMapper messageMapper;

    /**
     * UC 39 — Khách hàng lấy lịch sử tin nhắn hỗ trợ (hỗ trợ cursor beforeId và polling afterId).
     */
    @Transactional(readOnly = true)
    public MessagePageResponse getCustomerMessages(
            Long customerId,
            Long complaintId,
            Long beforeId,
            Long afterId,
            Integer limit
    ) {
        if (customerId == null) {
            throw new AccessDeniedException("Không xác định được tài khoản Khách hàng.");
        }
        if (complaintId == null) {
            throw new ResourceNotFoundException("ID yêu cầu hỗ trợ không hợp lệ");
        }
        if (beforeId != null && afterId != null) {
            throw new BusinessException("Không thể truyền đồng thời cả beforeId và afterId.");
        }

        Complaint complaint = complaintRepository.findByIdWithDetails(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu hỗ trợ với ID: " + complaintId));

        if (complaint.getCustomer() == null || !complaint.getCustomer().getId().equals(customerId)) {
            throw new AccessDeniedException("Bạn không có quyền xem tin nhắn của yêu cầu hỗ trợ khác.");
        }

        Conversation conversation = conversationRepository.findByComplaintId(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cuộc trò chuyện hỗ trợ cho yêu cầu: " + complaintId));

        boolean canSend = complaint.getStatus() == ComplaintStatus.OPEN
                || complaint.getStatus() == ComplaintStatus.IN_REVIEW;

        return loadMessagePage(conversation.getId(), complaintId, canSend, beforeId, afterId, limit);
    }

    /**
     * UC 39 — Khách hàng gửi tin nhắn mới trong cuộc trò chuyện hỗ trợ (chỉ khi OPEN hoặc IN_REVIEW).
     */
    @Transactional
    public MessageResponse sendCustomerMessage(
            Long customerId,
            Long complaintId,
            SendMessageRequest request
    ) {
        if (complaintId == null) {
            throw new ResourceNotFoundException("ID yêu cầu hỗ trợ không hợp lệ");
        }
        if (request == null) {
            throw new BusinessException("Nội dung tin nhắn không được để trống.");
        }

        String trimmedBody = validateAndTrimBody(request.getBody());
        Account customerAccount = loadActiveCustomer(customerId);

        // Khóa bi quan complaint chống race condition khi Admin đóng khiếu nại đồng thời
        Complaint complaint = complaintRepository.findByIdForUpdate(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu hỗ trợ với ID: " + complaintId));

        if (complaint.getCustomer() == null || !complaint.getCustomer().getId().equals(customerId)) {
            throw new AccessDeniedException("Bạn không có quyền gửi tin nhắn vào yêu cầu hỗ trợ của khách hàng khác.");
        }

        if (complaint.getStatus() != ComplaintStatus.OPEN && complaint.getStatus() != ComplaintStatus.IN_REVIEW) {
            throw new BusinessException(
                    "Yêu cầu hỗ trợ đã được đóng (" + complaint.getStatus() + "), không thể gửi thêm tin nhắn."
            );
        }

        // Xác thực ngữ cảnh booking đính kèm tin nhắn (database-design-final.md dòng 670)
        Booking messageBooking = resolveMessageBookingForCustomer(customerId, complaint, request.getBookingId());

        Conversation conversation = conversationRepository.findByComplaintId(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cuộc trò chuyện hỗ trợ cho yêu cầu: " + complaintId));

        Instant now = Instant.now();

        Message message = new Message();
        message.setConversation(conversation);
        message.setSender(customerAccount);
        message.setBooking(messageBooking);
        message.setBody(trimmedBody);
        message.setReadAt(null);
        message.setCreatedAt(now);
        Message savedMessage = messageRepository.saveAndFlush(message);

        // Cập nhật mốc hoạt động gần nhất để sắp xếp danh sách
        conversation.setUpdatedAt(now);
        conversationRepository.save(conversation);
        complaint.setUpdatedAt(now);
        complaintRepository.save(complaint);

        return messageMapper.toResponse(savedMessage);
    }

    /**
     * UC 33 — Quản trị viên lấy lịch sử tin nhắn hỗ trợ của một khiếu nại (cursor beforeId + polling afterId).
     * Bất kỳ Admin nào đều được đọc lịch sử tin nhắn (kể cả khi OPEN hoặc đã đóng) để nắm bối cảnh trước khi nhận/kiểm tra.
     * Cờ canSendMessage chỉ = true khi khiếu nại đang IN_REVIEW và chính Admin đang gọi là người phụ trách.
     */
    @Transactional(readOnly = true)
    public MessagePageResponse getAdminMessages(
            Long currentAdminId,
            Long complaintId,
            Long beforeId,
            Long afterId,
            Integer limit
    ) {
        if (currentAdminId == null) {
            throw new AccessDeniedException("Không xác định được tài khoản Quản trị viên.");
        }
        if (complaintId == null) {
            throw new ResourceNotFoundException("ID khiếu nại không hợp lệ");
        }
        if (beforeId != null && afterId != null) {
            throw new BusinessException("Không thể truyền đồng thời cả beforeId và afterId.");
        }

        Complaint complaint = complaintRepository.findByIdWithDetails(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khiếu nại với ID: " + complaintId));

        Conversation conversation = conversationRepository.findByComplaintId(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cuộc trò chuyện hỗ trợ cho khiếu nại: " + complaintId));

        boolean canSend = complaint.getStatus() == ComplaintStatus.IN_REVIEW
                && complaint.getAssignedAdmin() != null
                && complaint.getAssignedAdmin().getId().equals(currentAdminId);

        return loadMessagePage(conversation.getId(), complaintId, canSend, beforeId, afterId, limit);
    }

    /**
     * UC 33 — Quản trị viên đang phụ trách gửi tin nhắn phản hồi trong cuộc trò chuyện hỗ trợ (chỉ khi IN_REVIEW).
     * Khóa bi quan dòng complaint chống xung đột với reassign / resolve / reject đồng thời.
     */
    @Transactional
    public MessageResponse sendAdminMessage(
            Long currentAdminId,
            Long complaintId,
            SendMessageRequest request
    ) {
        if (complaintId == null) {
            throw new ResourceNotFoundException("ID khiếu nại không hợp lệ");
        }
        if (request == null) {
            throw new BusinessException("Nội dung tin nhắn không được để trống.");
        }

        String trimmedBody = validateAndTrimBody(request.getBody());
        Account adminAccount = loadActiveAdmin(currentAdminId);

        // Khóa bi quan complaint chống race condition khi Admin khác reassign hoặc đóng khiếu nại đồng thời
        Complaint complaint = complaintRepository.findByIdForUpdate(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khiếu nại với ID: " + complaintId));

        ComplaintStatus status = complaint.getStatus();
        if (status == ComplaintStatus.OPEN) {
            throw new BusinessException("Vui lòng tiếp nhận xử lý khiếu nại (assign) trước khi gửi phản hồi cho khách hàng.");
        }
        if (status == ComplaintStatus.RESOLVED || status == ComplaintStatus.REJECTED) {
            throw new BusinessException(
                    "Khiếu nại đã được đóng (" + status + "), không thể gửi thêm tin nhắn."
            );
        }
        if (status != ComplaintStatus.IN_REVIEW) {
            throw new BusinessException("Trạng thái khiếu nại không hợp lệ để gửi phản hồi: " + status);
        }

        if (complaint.getAssignedAdmin() == null || !complaint.getAssignedAdmin().getId().equals(adminAccount.getId())) {
            throw new AccessDeniedException("Chỉ Quản trị viên đang phụ trách khiếu nại này mới được gửi phản hồi.");
        }

        Booking messageBooking = resolveMessageBookingForAdmin(complaint, request.getBookingId());

        Conversation conversation = conversationRepository.findByComplaintId(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cuộc trò chuyện hỗ trợ cho khiếu nại: " + complaintId));

        Instant now = Instant.now();

        Message message = new Message();
        message.setConversation(conversation);
        message.setSender(adminAccount);
        message.setBooking(messageBooking);
        message.setBody(trimmedBody);
        message.setReadAt(null);
        message.setCreatedAt(now);
        Message savedMessage = messageRepository.saveAndFlush(message);

        // Cập nhật mốc hoạt động gần nhất của conversation & complaint
        conversation.setUpdatedAt(now);
        conversationRepository.saveAndFlush(conversation);
        complaint.setUpdatedAt(now);
        complaintRepository.saveAndFlush(complaint);

        return messageMapper.toResponse(savedMessage);
    }

    /**
     * Hàm dùng chung nạp trang tin nhắn theo cursor beforeId hoặc polling afterId (tái sử dụng cho UC33 Admin).
     */
    protected MessagePageResponse loadMessagePage(
            Long conversationId,
            Long complaintId,
            boolean canSendMessage,
            Long beforeId,
            Long afterId,
            Integer limit
    ) {
        int effectiveLimit = (limit != null && limit > 0) ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT;
        Pageable fetchPage = PageRequest.of(0, effectiveLimit + 1);

        boolean hasMore;
        List<Message> selected;
        Long nextBeforeId = null;
        Long lastMessageId;

        if (afterId != null) {
            // Polling tiến lên: id > afterId ASC
            List<Message> fetched = messageRepository.findPageAfterId(conversationId, afterId, fetchPage);
            hasMore = fetched.size() > effectiveLimit;
            selected = hasMore ? new ArrayList<>(fetched.subList(0, effectiveLimit)) : new ArrayList<>(fetched);
            lastMessageId = selected.isEmpty() ? afterId : selected.get(selected.size() - 1).getId();
        } else if (beforeId != null) {
            // Cursor tải ngược: id < beforeId DESC -> đảo lại ASC
            List<Message> fetched = messageRepository.findPageBeforeId(conversationId, beforeId, fetchPage);
            hasMore = fetched.size() > effectiveLimit;
            selected = hasMore ? new ArrayList<>(fetched.subList(0, effectiveLimit)) : new ArrayList<>(fetched);
            Collections.reverse(selected);
            nextBeforeId = hasMore && !selected.isEmpty() ? selected.get(0).getId() : null;
            lastMessageId = selected.isEmpty() ? null : selected.get(selected.size() - 1).getId();
        } else {
            // Trang mới nhất: ORDER BY id DESC -> đảo lại ASC
            List<Message> fetched = messageRepository.findLatestPage(conversationId, fetchPage);
            hasMore = fetched.size() > effectiveLimit;
            selected = hasMore ? new ArrayList<>(fetched.subList(0, effectiveLimit)) : new ArrayList<>(fetched);
            Collections.reverse(selected);
            nextBeforeId = hasMore && !selected.isEmpty() ? selected.get(0).getId() : null;
            lastMessageId = selected.isEmpty() ? null : selected.get(selected.size() - 1).getId();
        }

        List<MessageResponse> items = selected.stream()
                .map(messageMapper::toResponse)
                .toList();

        return MessagePageResponse.builder()
                .conversationId(conversationId)
                .complaintId(complaintId)
                .canSendMessage(canSendMessage)
                .hasMore(hasMore)
                .nextBeforeId(nextBeforeId)
                .lastMessageId(lastMessageId)
                .items(items)
                .build();
    }

    private Booking resolveMessageBookingForCustomer(Long customerId, Complaint complaint, Long requestedBookingId) {
        Booking complaintBooking = complaint.getBooking();
        if (requestedBookingId == null) {
            return complaintBooking;
        }

        if (complaintBooking != null) {
            if (!complaintBooking.getId().equals(requestedBookingId)) {
                throw new BusinessException("Đơn đặt lịch đính kèm tin nhắn phải khớp với đơn của yêu cầu hỗ trợ.");
            }
            return complaintBooking;
        }

        Booking booking = bookingRepository.findById(requestedBookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt lịch với ID: " + requestedBookingId));
        if (booking.getCustomer() == null || !booking.getCustomer().getId().equals(customerId)) {
            throw new AccessDeniedException("Bạn không có quyền đính kèm đơn đặt lịch của khách hàng khác.");
        }
        return booking;
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

    private Booking resolveMessageBookingForAdmin(Complaint complaint, Long requestedBookingId) {
        Booking complaintBooking = complaint.getBooking();
        if (requestedBookingId == null) {
            return complaintBooking;
        }

        if (complaintBooking != null) {
            if (!complaintBooking.getId().equals(requestedBookingId)) {
                throw new BusinessException("Đơn đặt lịch đính kèm tin nhắn phải khớp với đơn của khiếu nại.");
            }
            return complaintBooking;
        }

        Booking booking = bookingRepository.findById(requestedBookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt lịch với ID: " + requestedBookingId));
        if (complaint.getCustomer() == null
                || booking.getCustomer() == null
                || !booking.getCustomer().getId().equals(complaint.getCustomer().getId())) {
            throw new BusinessException("Đơn đặt lịch đính kèm không thuộc khách hàng của khiếu nại này.");
        }
        return booking;
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

    private String validateAndTrimBody(String body) {
        if (body == null || body.trim().isEmpty()) {
            throw new BusinessException("Nội dung tin nhắn không được để trống.");
        }
        String trimmed = body.trim();
        if (trimmed.length() > 2000) {
            throw new BusinessException("Nội dung tin nhắn không được vượt quá 2000 ký tự.");
        }
        return trimmed;
    }
}
