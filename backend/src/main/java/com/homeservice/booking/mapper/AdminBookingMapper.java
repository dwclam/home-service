package com.homeservice.booking.mapper;

import com.homeservice.booking.dto.response.AdminBookingSummaryResponse;
import com.homeservice.booking.entity.Booking;
import org.springframework.stereotype.Component;

/**
 * Mapper chuyển đổi Entity Booking sang DTO phục vụ Admin (UC 31).
 */
@Component
public class AdminBookingMapper {

    public AdminBookingSummaryResponse toSummaryResponse(Booking booking) {
        if (booking == null) {
            return null;
        }

        AdminBookingSummaryResponse.CustomerSummary customerSummary = null;
        if (booking.getCustomer() != null) {
            customerSummary = AdminBookingSummaryResponse.CustomerSummary.builder()
                    .id(booking.getCustomer().getId())
                    .displayName(booking.getCustomer().getDisplayName())
                    .phone(booking.getCustomer().getPhone())
                    .email(booking.getCustomer().getEmail())
                    .build();
        }

        AdminBookingSummaryResponse.ProviderSummary providerSummary = null;
        if (booking.getProvider() != null) {
            String phone = null;
            String email = null;
            if (booking.getProvider().getAccount() != null) {
                phone = booking.getProvider().getAccount().getPhone();
                email = booking.getProvider().getAccount().getEmail();
            }
            providerSummary = AdminBookingSummaryResponse.ProviderSummary.builder()
                    .id(booking.getProvider().getAccountId())
                    .businessName(booking.getProvider().getBusinessName())
                    .phone(phone)
                    .email(email)
                    .build();
        }

        AdminBookingSummaryResponse.ServiceSummary serviceSummary = AdminBookingSummaryResponse.ServiceSummary.builder()
                .id(booking.getService() != null ? booking.getService().getId() : null)
                .serviceTitleSnapshot(booking.getServiceTitleSnapshot())
                .durationMinutesSnapshot(booking.getDurationMinutesSnapshot())
                .build();

        return AdminBookingSummaryResponse.builder()
                .id(booking.getId())
                .bookingCode(booking.getBookingCode())
                .customer(customerSummary)
                .provider(providerSummary)
                .service(serviceSummary)
                .startsAt(booking.getStartsAt())
                .endsAt(booking.getEndsAt())
                .status(booking.getStatus())
                .totalAmountVnd(booking.getTotalAmountVnd())
                .depositAmountVnd(booking.getDepositAmountVnd())
                .balanceAmountVnd(booking.getBalanceAmountVnd())
                .settlementStatus(booking.getSettlementStatus())
                .providerDueVnd(booking.getProviderDueVnd())
                .version(booking.getVersion())
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
