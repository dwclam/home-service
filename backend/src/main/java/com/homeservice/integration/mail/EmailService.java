package com.homeservice.integration.mail;

public interface EmailService {
    void sendVerificationEmail(String toEmail, String otp);
    void sendProviderApplicationVerificationEmail(String toEmail, String otp);
    void sendProviderApprovedEmail(String toEmail, String temporaryPassword);
}
