package com.homeservice.admin.dto.response;

import com.homeservice.provider.entity.ProviderApplication;
import com.homeservice.provider.enums.CredentialsEmailStatus;
import com.homeservice.provider.enums.ProviderApplicationStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProviderApplicationDecisionResponse {
    private Long id;
    private ProviderApplicationStatus status;
    private Instant decidedAt;
    private Long decidedByAdminId;
    private String rejectionReason;
    private Long providerAccountId;
    private CredentialsEmailStatus credentialsEmailStatus;

    public static ProviderApplicationDecisionResponse from(ProviderApplication application, Long providerAccountId) {
        var admin = application.getDecidedByAdmin();
        return new ProviderApplicationDecisionResponse(application.getId(), application.getStatus(),
                application.getDecidedAt(), admin == null ? null : admin.getId(), application.getRejectionReason(),
                providerAccountId, application.getCredentialsEmailStatus());
    }
}
