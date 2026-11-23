package com.homeservice.support.service;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.audit.entity.AdminAuditLog;
import com.homeservice.audit.repository.AdminAuditLogRepository;
import com.homeservice.booking.entity.Booking;
import com.homeservice.booking.repository.BookingRepository;
import com.homeservice.chat.entity.Conversation;
import com.homeservice.chat.entity.Message;
import com.homeservice.chat.enums.ConversationType;
import com.homeservice.chat.repository.ConversationRepository;
import com.homeservice.chat.repository.MessageRepository;
import com.homeservice.common.dto.PageResponse;
import com.homeservice.common.exception.BusinessException;
import com.homeservice.common.exception.DataConflictException;
import com.homeservice.common.exception.ResourceNotFoundException;
import com.homeservice.support.dto.request.AdminComplaintSearchFilter;
import com.homeservice.support.dto.request.CreateComplaintRequest;
import com.homeservice.support.dto.request.CustomerComplaintFilter;
import com.homeservice.support.dto.response.AdminComplaintDetailResponse;
import com.homeservice.support.dto.response.AdminComplaintSummaryResponse;
import com.homeservice.support.dto.response.CustomerComplaintDetailResponse;
import com.homeservice.support.dto.response.CustomerComplaintSummaryResponse;
import com.homeservice.support.entity.Complaint;
import com.homeservice.support.enums.ComplaintStatus;
import com.homeservice.support.mapper.ComplaintMapper;
import com.homeservice.support.repository.ComplaintRepository;
import com.homeservice.support.repository.specification.ComplaintSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service xử lý nghiệp vụ Hỗ trợ & Khiếu nại (UC 39 & UC 33).
 */
@Service
@RequiredArgsConstructor
public class ComplaintService {

    public static final String ENTITY_TYPE_COMPLAINT = "COMPLAINT";

    public static final List<ComplaintStatus> UNRESOLVED_STATUSES = List.of(
            ComplaintStatus.OPEN,
            ComplaintStatus.IN_REVIEW
    );

    private static final Set<String> ADMIN_ALLOWED_SORT_FIELDS = Set.of(
            "createdAt", "updatedAt", "status", "id"
    );

    private final ComplaintRepository complaintRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final BookingRepository bookingRepository;
    private final AccountRepository accountRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;
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
     * UC 39 — Khách hàng xem danh sách yêu cầu hỗ trợ / khiếu nại của chính mình (lọc động, phân trang, tránh N+1).
     */
    @Transactional(readOnly = true)
    public PageResponse<CustomerComplaintSummaryResponse> getCustomerComplaints(
            Long customerId,
            CustomerComplaintFilter filter
    ) {
        if (customerId == null) {
            throw new AccessDeniedException("Không xác định được tài khoản Khách hàng.");
        }
        if (filter == null) {
            filter = new CustomerComplaintFilter();
        }

        int page = (filter.getPage() != null && filter.getPage() >= 0) ? filter.getPage() : 0;
        int size = (filter.getSize() != null && filter.getSize() > 0) ? Math.min(filter.getSize(), 50) : 20;

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id"))
        );

        Page<Complaint> complaintPage = complaintRepository.findAll(
                ComplaintSpecification.forCustomer(customerId, filter),
                pageable
        );

        List<Complaint> complaints = complaintPage.getContent();
        if (complaints.isEmpty()) {
            return new PageResponse<>(
                    List.of(),
                    complaintPage.getNumber(),
                    complaintPage.getSize(),
                    complaintPage.getTotalElements(),
                    complaintPage.getTotalPages()
            );
        }

        // Batch query conversations & latest messages để tránh N+1
        List<Long> complaintIds = complaints.stream().map(Complaint::getId).toList();
        Map<Long, Conversation> convByComplaintId = conversationRepository.findByComplaintIdIn(complaintIds)
                .stream()
                .filter(c -> c.getComplaint() != null)
                .collect(Collectors.toMap(c -> c.getComplaint().getId(), Function.identity(), (a, b) -> a));

        List<Long> conversationIds = convByComplaintId.values().stream().map(Conversation::getId).toList();
        Map<Long, Message> latestMsgByConvId = conversationIds.isEmpty()
                ? Map.of()
                : messageRepository.findLatestByConversationIdIn(conversationIds)
                        .stream()
                        .filter(m -> m.getConversation() != null)
                        .collect(Collectors.toMap(m -> m.getConversation().getId(), Function.identity(), (a, b) -> a));

        List<CustomerComplaintSummaryResponse> items = complaints.stream()
                .map(c -> {
                    Conversation conv = convByComplaintId.get(c.getId());
                    Message latestMsg = conv != null ? latestMsgByConvId.get(conv.getId()) : null;
                    return complaintMapper.toCustomerSummaryResponse(c, conv, latestMsg);
                })
                .toList();

        return new PageResponse<>(
                items,
                complaintPage.getNumber(),
                complaintPage.getSize(),
                complaintPage.getTotalElements(),
                complaintPage.getTotalPages()
        );
    }

    /**
     * UC 39 — Khách hàng xem chi tiết 1 yêu cầu hỗ trợ / khiếu nại của chính mình (kiểm tra IDOR chặt chẽ).
     */
    @Transactional(readOnly = true)
    public CustomerComplaintDetailResponse getCustomerComplaintDetail(Long customerId, Long complaintId) {
        if (customerId == null) {
            throw new AccessDeniedException("Không xác định được tài khoản Khách hàng.");
        }
        if (complaintId == null) {
            throw new ResourceNotFoundException("ID yêu cầu hỗ trợ không hợp lệ");
        }

        Complaint complaint = complaintRepository.findByIdWithDetails(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu hỗ trợ với ID: " + complaintId));

        if (complaint.getCustomer() == null || !complaint.getCustomer().getId().equals(customerId)) {
            throw new AccessDeniedException("Bạn không có quyền xem yêu cầu hỗ trợ của khách hàng khác.");
        }

        Conversation conversation = conversationRepository.findByComplaintId(complaintId).orElse(null);
        return complaintMapper.toCustomerDetailResponse(complaint, conversation);
    }

    /**
     * UC 33 — Admin tra cứu danh sách khiếu nại toàn hệ thống kèm lọc đa tiêu chí, sắp xếp whitelist và phân trang.
     */
    @Transactional(readOnly = true)
    public PageResponse<AdminComplaintSummaryResponse> getAdminComplaints(AdminComplaintSearchFilter filter) {
        if (filter == null) {
            filter = new AdminComplaintSearchFilter();
        }

        int page = (filter.getPage() != null && filter.getPage() >= 0) ? filter.getPage() : 0;
        int size = (filter.getSize() != null && filter.getSize() > 0) ? Math.min(filter.getSize(), 100) : 20;

        String sortBy = filter.getSortBy();
        if (sortBy == null || !ADMIN_ALLOWED_SORT_FIELDS.contains(sortBy)) {
            sortBy = "createdAt";
        }
        Sort.Direction direction = "ASC".equalsIgnoreCase(filter.getSortDir()) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        Page<Complaint> complaintPage = complaintRepository.findAll(
                ComplaintSpecification.forAdmin(filter),
                pageable
        );

        List<Complaint> complaints = complaintPage.getContent();
        if (complaints.isEmpty()) {
            return new PageResponse<>(
                    List.of(),
                    complaintPage.getNumber(),
                    complaintPage.getSize(),
                    complaintPage.getTotalElements(),
                    complaintPage.getTotalPages()
            );
        }

        // Batch query conversations & latest messages để tránh N+1
        List<Long> complaintIds = complaints.stream().map(Complaint::getId).toList();
        Map<Long, Conversation> convByComplaintId = conversationRepository.findByComplaintIdIn(complaintIds)
                .stream()
                .filter(c -> c.getComplaint() != null)
                .collect(Collectors.toMap(c -> c.getComplaint().getId(), Function.identity(), (a, b) -> a));

        List<Long> conversationIds = convByComplaintId.values().stream().map(Conversation::getId).toList();
        Map<Long, Message> latestMsgByConvId = conversationIds.isEmpty()
                ? Map.of()
                : messageRepository.findLatestByConversationIdIn(conversationIds)
                        .stream()
                        .filter(m -> m.getConversation() != null)
                        .collect(Collectors.toMap(m -> m.getConversation().getId(), Function.identity(), (a, b) -> a));

        List<AdminComplaintSummaryResponse> items = complaints.stream()
                .map(c -> {
                    Conversation conv = convByComplaintId.get(c.getId());
                    Message latestMsg = conv != null ? latestMsgByConvId.get(conv.getId()) : null;
                    return complaintMapper.toAdminSummaryResponse(c, conv, latestMsg);
                })
                .toList();

        return new PageResponse<>(
                items,
                complaintPage.getNumber(),
                complaintPage.getSize(),
                complaintPage.getTotalElements(),
                complaintPage.getTotalPages()
        );
    }

    /**
     * UC 33 — Admin xem chi tiết toàn diện 360° của 1 khiếu nại (kèm đơn liên quan, trạng thái đối soát,
     * số khiếu nại chưa đóng trên đơn, cờ canCurrentAdminReply và nhật ký audit logs).
     */
    @Transactional(readOnly = true)
    public AdminComplaintDetailResponse getAdminComplaintDetail(Long currentAdminId, Long complaintId) {
        if (complaintId == null) {
            throw new ResourceNotFoundException("ID khiếu nại không hợp lệ");
        }

        Complaint complaint = complaintRepository.findByIdWithDetails(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khiếu nại với ID: " + complaintId));

        Conversation conversation = conversationRepository.findByComplaintId(complaintId).orElse(null);

        long unresolvedCountForBooking = 0L;
        if (complaint.getBooking() != null) {
            unresolvedCountForBooking = complaintRepository.countByBookingIdAndStatusIn(
                    complaint.getBooking().getId(),
                    UNRESOLVED_STATUSES
            );
        }

        List<AdminAuditLog> auditLogs = adminAuditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
                ENTITY_TYPE_COMPLAINT,
                String.valueOf(complaintId)
        );

        return complaintMapper.toAdminDetailResponse(
                complaint,
                conversation,
                unresolvedCountForBooking,
                auditLogs,
                currentAdminId
        );
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
