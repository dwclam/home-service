package com.homeservice.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.validator.constraints.CodePointLength;

@Getter
@Setter
public class FirstPasswordChangeRequest {
    @NotBlank
    @CodePointLength(max = 72)
    private String currentPassword;

    @NotBlank
    @CodePointLength(min = 8, max = 72)
    private String newPassword;

    @Override
    public String toString() {
        return "FirstPasswordChangeRequest[REDACTED]";
    }
}
