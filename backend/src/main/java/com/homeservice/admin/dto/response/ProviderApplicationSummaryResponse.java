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
public class ProviderApplicationSummaryResponse {
    private Long id;
    private String email;
    private String applicantName;
    private String businessName;
    private String city;
    private ProviderApplicationStatus status;
    private Instant createdAt;
    private Instant emailVerifiedAt;
    private CredentialsEmailStatus credentialsEmailStatus;

    public static ProviderApplicationSummaryResponse from(ProviderApplication application) {
        return new ProviderApplicationSummaryResponse(application.getId(), application.getEmail(),
                application.getApplicantName(), application.getBusinessName(), application.getCity(),
                application.getStatus(), application.getCreatedAt(), application.getEmailVerifiedAt(),
                application.getCredentialsEmailStatus());
    }
}
