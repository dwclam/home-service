package com.homeservice.integration.mail;

import com.homeservice.auth.exception.AuthException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class SmtpEmailService implements EmailService {
    private final JavaMailSender sender;
    private final String from;

    public SmtpEmailService(JavaMailSender sender, @Value("${app.mail.from}") String from) {
        this.sender = sender;
        this.from = from;
    }

    @Override
    public void sendVerificationEmail(String toEmail, String otp) {
        send(toEmail, "Nestify — Xác thực email",
                "Mã xác thực email của bạn là: " + otp + ".\nMã có hiệu lực tối đa 10 phút. "
                        + "Không chia sẻ mã này với người khác.");
    }

    @Override
    public void sendProviderApprovedEmail(String toEmail, String temporaryPassword) {
        send(toEmail, "Nestify — Hồ sơ nhà cung cấp đã được duyệt",
                "Tài khoản: " + toEmail + "\nMật khẩu tạm: " + temporaryPassword
                        + "\nVui lòng đổi mật khẩu ngay trong lần đăng nhập đầu tiên.");
    }

    private void send(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        try {
            sender.send(message);
        } catch (MailException exception) {
            // Do not expose SMTP details, credentials or message bodies (which contain secrets).
            throw new AuthException(HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_DELIVERY_FAILED",
                    "Chưa gửi được email xác thực. Vui lòng thử lại sau.");
        }
    }
}
