package com.homeservice.support.service;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.audit.entity.AdminAuditLog;
import com.homeservice.audit.repository.AdminAuditLogRepository;
import com.homeservice.audit.service.AdminAuditLogService;
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
import com.homeservice.support.dto.request.AdminAssignComplaintRequest;
import com.homeservice.support.dto.request.AdminCloseComplaintRequest;
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
import java.util.LinkedHashMap;
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
    public static final String ACTION_COMPLAINT_ASSIGNED = "COMPLAINT_ASSIGNED";
    public static final String ACTION_COMPLAINT_REASSIGNED = "COMPLAINT_REASSIGNED";
    public static final String ACTION_COMPLAINT_RESOLVED = "COMPLAINT_RESOLVED";
    public static final String ACTION_COMPLAINT_REJECTED = "COMPLAINT_REJECTED";

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
    private final AdminAuditLogService adminAuditLogService;
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
     * UC 33 — Admin tiếp nhận xử lý (OPEN -> IN_REVIEW) hoặc chuyển giao Admin phụ trách khác (IN_REVIEW -> IN_REVIEW).
     * Khóa bi quan dòng complaints để chống 2 Admin nhận trùng đồng thời.
     * Đổi Admin phụ trách (reassign) bắt buộc có reason (5..500 ký tự) và giữ nguyên toàn bộ lịch sử chat (conversations/messages).
     * Ghi nhận bắt buộc vào admin_audit_logs trong cùng 1 transaction.
     */
    @Transactional
    public AdminComplaintDetailResponse assignComplaintByAdmin(
            Long currentAdminId,
            Long complaintId,
            AdminAssignComplaintRequest request
    ) {
        if (complaintId == null) {
            throw new ResourceNotFoundException("ID khiếu nại không hợp lệ");
        }

        // 1. Xác minh Admin thực hiện thao tác đang ACTIVE trong DB
        Account actingAdmin = loadActiveAdmin(currentAdminId);

        // 2. Xác định Admin mục tiêu được phân công (mặc định là chính actingAdmin nếu targetAdminId == null)
        Long targetAdminId = (request != null && request.getTargetAdminId() != null)
                ? request.getTargetAdminId()
                : actingAdmin.getId();
        Account targetAdmin = targetAdminId.equals(actingAdmin.getId())
                ? actingAdmin
                : loadTargetActiveAdmin(targetAdminId);

        // 3. Khóa bi quan khiếu nại chống race condition
        Complaint complaint = complaintRepository.findByIdForUpdate(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khiếu nại với ID: " + complaintId));

        ComplaintStatus previousStatus = complaint.getStatus();
        if (previousStatus == ComplaintStatus.RESOLVED || previousStatus == ComplaintStatus.REJECTED) {
            throw new BusinessException(
                    "Khiếu nại đã được đóng (" + previousStatus + "), không thể tiếp nhận hoặc chuyển giao phân công."
            );
        }

        Long previousAssignedAdminId = complaint.getAssignedAdmin() != null
                ? complaint.getAssignedAdmin().getId()
                : null;
        String rawReason = request != null ? request.getReason() : null;

        String action;
        String auditReason;

        if (previousStatus == ComplaintStatus.OPEN) {
            // Tiếp nhận mới: OPEN -> IN_REVIEW (reason tùy chọn, nếu có tối đa 500 ký tự)
            if (rawReason != null && !rawReason.trim().isEmpty()) {
                String trimmed = rawReason.trim();
                if (trimmed.length() > 500) {
                    throw new BusinessException("Lý do phân công không được vượt quá 500 ký tự.");
                }
                auditReason = trimmed;
            } else {
                auditReason = null;
            }
            complaint.setStatus(ComplaintStatus.IN_REVIEW);
            complaint.setAssignedAdmin(targetAdmin);
            action = ACTION_COMPLAINT_ASSIGNED;
        } else if (previousStatus == ComplaintStatus.IN_REVIEW) {
            // Chuyển giao (reassign): không cho gán trùng chính người đang phụ trách và BẮT BUỘC có reason (5..500 ký tự)
            if (previousAssignedAdminId != null && previousAssignedAdminId.equals(targetAdmin.getId())) {
                throw new BusinessException("Khiếu nại này hiện đã được phân công cho Quản trị viên này.");
            }
            auditReason = validateAndTrim(rawReason, 5, 500, "Lý do chuyển giao phân công");
            complaint.setAssignedAdmin(targetAdmin);
            action = ACTION_COMPLAINT_REASSIGNED;
        } else {
            throw new BusinessException("Trạng thái khiếu nại không hợp lệ để phân công: " + previousStatus);
        }

        Instant now = Instant.now();
        complaint.setUpdatedAt(now);
        Complaint savedComplaint = complaintRepository.saveAndFlush(complaint);

        // Ghi nhận admin_audit_logs trong cùng transaction (JSON before/after)
        Map<String, Object> beforeState = new LinkedHashMap<>();
        beforeState.put("status", previousStatus.name());
        beforeState.put("assignedAdminId", previousAssignedAdminId);

        Map<String, Object> afterState = new LinkedHashMap<>();
        afterState.put("status", savedComplaint.getStatus().name());
        afterState.put("assignedAdminId", targetAdmin.getId());

        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("before", beforeState);
        changes.put("after", afterState);

        adminAuditLogService.record(
                actingAdmin,
                action,
                ENTITY_TYPE_COMPLAINT,
                String.valueOf(savedComplaint.getId()),
                auditReason,
                changes,
                now
        );

        return reloadAndBuildAdminDetail(currentAdminId, savedComplaint);
    }

    /**
     * UC 33 — Admin phụ trách kết luận giải quyết khiếu nại (IN_REVIEW -> RESOLVED).
     * Bắt buộc khiếu nại đang IN_REVIEW và thuộc chính Admin đang gọi API.
     * Lưu resolution, resolvedAt, ghi admin_audit_logs trong cùng transaction và không tự sửa bookings.settlement_status (MD10 Phương án B).
     */
    @Transactional
    public AdminComplaintDetailResponse resolveComplaintByAdmin(
            Long currentAdminId,
            Long complaintId,
            AdminCloseComplaintRequest request
    ) {
        return closeComplaintByAdmin(
                currentAdminId,
                complaintId,
                request,
                ComplaintStatus.RESOLVED,
                ACTION_COMPLAINT_RESOLVED,
                "Nội dung kết luận giải quyết"
        );
    }

    /**
     * UC 33 — Admin phụ trách từ chối khiếu nại (IN_REVIEW -> REJECTED).
     * Bắt buộc khiếu nại đang IN_REVIEW và thuộc chính Admin đang gọi API.
     * Lưu lý do từ chối vào resolution, resolvedAt, ghi admin_audit_logs trong cùng transaction và không tự sửa bookings.settlement_status (MD10 Phương án B).
     */
    @Transactional
    public AdminComplaintDetailResponse rejectComplaintByAdmin(
            Long currentAdminId,
            Long complaintId,
            AdminCloseComplaintRequest request
    ) {
        return closeComplaintByAdmin(
                currentAdminId,
                complaintId,
                request,
                ComplaintStatus.REJECTED,
                ACTION_COMPLAINT_REJECTED,
                "Lý do từ chối khiếu nại"
        );
    }

    private AdminComplaintDetailResponse closeComplaintByAdmin(
            Long currentAdminId,
            Long complaintId,
            AdminCloseComplaintRequest request,
            ComplaintStatus targetStatus,
            String auditAction,
            String resolutionFieldLabel
    ) {
        if (complaintId == null) {
            throw new ResourceNotFoundException("ID khiếu nại không hợp lệ");
        }
        if (request == null) {
            throw new BusinessException(resolutionFieldLabel + " không được để trống.");
        }

        // 1. Validate và chuẩn hóa nội dung kết luận (5..1000 ký tự sau trim)
        String trimmedResolution = validateAndTrim(request.getResolution(), 5, 1000, resolutionFieldLabel);

        // 2. Xác minh Admin thao tác đang ACTIVE trong DB
        Account actingAdmin = loadActiveAdmin(currentAdminId);

        // 3. Khóa bi quan dòng khiếu nại chống xung đột đóng / chuyển giao / gửi tin đồng thời
        Complaint complaint = complaintRepository.findByIdForUpdate(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khiếu nại với ID: " + complaintId));

        ComplaintStatus previousStatus = complaint.getStatus();
        if (previousStatus == ComplaintStatus.OPEN) {
            throw new BusinessException("Vui lòng tiếp nhận hoặc phân công khiếu nại (IN_REVIEW) trước khi chốt kết quả xử lý.");
        }
        if (previousStatus == ComplaintStatus.RESOLVED || previousStatus == ComplaintStatus.REJECTED) {
            throw new BusinessException("Khiếu nại đã được đóng (" + previousStatus + "), không thể thay đổi kết quả.");
        }
        if (previousStatus != ComplaintStatus.IN_REVIEW) {
            throw new BusinessException("Trạng thái khiếu nại không hợp lệ để chốt kết quả: " + previousStatus);
        }

        // 4. Chỉ Admin đang phụ trách mới được chốt kết quả (Admin khác phải reassign trước)
        Long assignedAdminId = complaint.getAssignedAdmin() != null
                ? complaint.getAssignedAdmin().getId()
                : null;
        if (assignedAdminId == null || !assignedAdminId.equals(actingAdmin.getId())) {
            throw new AccessDeniedException(
                    "Chỉ Quản trị viên đang phụ trách khiếu nại này mới được chốt kết quả xử lý. "
                            + "Vui lòng chuyển giao phân công (reassign) trước nếu bạn cần tiếp quản."
            );
        }

        String previousResolution = complaint.getResolution();
        Instant previousResolvedAt = complaint.getResolvedAt();
        Instant now = Instant.now();

        complaint.setStatus(targetStatus);
        complaint.setResolution(trimmedResolution);
        complaint.setResolvedAt(now);
        complaint.setUpdatedAt(now);
        Complaint savedComplaint = complaintRepository.saveAndFlush(complaint);

        // 5. Ghi nhận bắt buộc admin_audit_logs trong cùng transaction (JSON before/after)
        Map<String, Object> beforeState = new LinkedHashMap<>();
        beforeState.put("status", previousStatus.name());
        beforeState.put("resolution", previousResolution);
        beforeState.put("resolvedAt", previousResolvedAt != null ? previousResolvedAt.toString() : null);
        beforeState.put("assignedAdminId", assignedAdminId);

        Map<String, Object> afterState = new LinkedHashMap<>();
        afterState.put("status", savedComplaint.getStatus().name());
        afterState.put("resolution", savedComplaint.getResolution());
        afterState.put("resolvedAt", now.toString());
        afterState.put("assignedAdminId", assignedAdminId);

        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("before", beforeState);
        changes.put("after", afterState);

        adminAuditLogService.record(
                actingAdmin,
                auditAction,
                ENTITY_TYPE_COMPLAINT,
                String.valueOf(savedComplaint.getId()),
                trimmedResolution,
                changes,
                now
        );

        // 6. Không tự sửa bookings.settlement_status (MD10 Phương án B); nạp lại 360° kèm unresolvedComplaintCount mới nhất
        return reloadAndBuildAdminDetail(currentAdminId, savedComplaint);
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

    private Account loadTargetActiveAdmin(Long targetAdminId) {
        Account target = accountRepository.findById(targetAdminId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Quản trị viên được phân công: " + targetAdminId));

        if (target.getAccountType() != AccountType.ADMIN) {
            throw new BusinessException("Tài khoản được phân công không phải Quản trị viên.");
        }
        if (target.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Tài khoản Quản trị viên được phân công chưa được kích hoạt hoặc đã bị khóa.");
        }
        return target;
    }

    private AdminComplaintDetailResponse reloadAndBuildAdminDetail(Long currentAdminId, Complaint savedComplaint) {
        Complaint hydrated = complaintRepository.findByIdWithDetails(savedComplaint.getId())
                .orElse(savedComplaint);
        Conversation conversation = conversationRepository.findByComplaintId(hydrated.getId()).orElse(null);

        long unresolvedCountForBooking = 0L;
        if (hydrated.getBooking() != null) {
            unresolvedCountForBooking = complaintRepository.countByBookingIdAndStatusIn(
                    hydrated.getBooking().getId(),
                    UNRESOLVED_STATUSES
            );
        }

        List<AdminAuditLog> auditLogs = adminAuditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
                ENTITY_TYPE_COMPLAINT,
                String.valueOf(hydrated.getId())
        );

        return complaintMapper.toAdminDetailResponse(
                hydrated,
                conversation,
                unresolvedCountForBooking,
                auditLogs,
                currentAdminId
        );
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
