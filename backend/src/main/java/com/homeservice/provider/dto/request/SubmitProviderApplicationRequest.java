package com.homeservice.provider.dto.request;

import com.homeservice.auth.dto.request.EmailRequest;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

public class SubmitProviderApplicationRequest extends EmailRequest {
    @NotBlank @Size(max = 150)
    private String applicantName;

    @NotBlank @Size(max = 32)
    private String phone;

    @NotBlank @Size(max = 200)
    private String businessName;

    @NotBlank @Size(max = 150)
    private String city;

    @NotBlank @Size(max = 5000)
    private String description;

    @NotBlank @Size(max = 2048)
    private String documentUrl;

    public SubmitProviderApplicationRequest() {
    }

    public SubmitProviderApplicationRequest(String email, String applicantName, String phone,
                                            String businessName, String city, String description, String documentUrl) {
        super(email);
        setApplicantName(applicantName);
        setPhone(phone);
        setBusinessName(businessName);
        setCity(city);
        setDescription(description);
        setDocumentUrl(documentUrl);
    }

    public String getApplicantName() { return applicantName; }
    public void setApplicantName(String value) { applicantName = stripped(value); }
    public String getPhone() { return phone; }
    public void setPhone(String value) { phone = stripped(value); }
    public String getBusinessName() { return businessName; }
    public void setBusinessName(String value) { businessName = stripped(value); }
    public String getCity() { return city; }
    public void setCity(String value) { city = stripped(value); }
    public String getDescription() { return description; }
    public void setDescription(String value) { description = stripped(value); }
    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String value) { documentUrl = stripped(value); }

    @AssertTrue(message = "Tài liệu phải là link HTTPS Google Drive hoặc Google Docs hợp lệ.")
    public boolean isDocumentUrlValid() {
        if (documentUrl == null || documentUrl.isBlank()) return true;
        try {
            URI uri = URI.create(documentUrl);
            return "https".equalsIgnoreCase(uri.getScheme())
                    && uri.getHost() != null
                    && Set.of("drive.google.com", "docs.google.com").contains(uri.getHost().toLowerCase(Locale.ROOT))
                    && uri.getUserInfo() == null
                    && (uri.getPort() == -1 || uri.getPort() == 443)
                    && uri.getPath() != null && !uri.getPath().isBlank() && !"/".equals(uri.getPath());
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static String stripped(String value) {
        return value == null ? null : value.strip();
    }

    @Override
    public String toString() { return "SubmitProviderApplicationRequest[REDACTED]"; }
}
