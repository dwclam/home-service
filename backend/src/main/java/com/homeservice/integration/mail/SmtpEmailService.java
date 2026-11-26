package com.homeservice.integration.mail;

import com.homeservice.auth.exception.AuthException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Service
public class SmtpEmailService implements EmailService {
    private static final String VERIFICATION_DELIVERY_FAILURE = "Chưa gửi được email xác thực. Vui lòng thử lại sau.";
    private final JavaMailSender sender;
    private final String from;
    private final String verificationTemplate;

    public SmtpEmailService(JavaMailSender sender, @Value("${app.mail.from}") String from) throws IOException {
        this.sender = sender;
        this.from = from;
        this.verificationTemplate = new ClassPathResource("templates/mail/verify-email.html")
                .getContentAsString(StandardCharsets.UTF_8);
    }

    @Override
    public void sendVerificationEmail(String toEmail, String otp) {
        sendOtp(toEmail, "Xác thực email", otp,
                "Nhập mã dưới đây trên trang đăng ký để xác thực email và kích hoạt tài khoản Nestify của bạn.");
    }

    @Override
    public void sendProviderApplicationVerificationEmail(String toEmail, String otp) {
        sendOtp(toEmail, "Xác thực hồ sơ nhà cung cấp", otp,
                "Nhập mã dưới đây trên trang nộp hồ sơ để xác thực email. "
                        + "Sau khi xác thực, hồ sơ sẽ được chuyển đến quản trị viên để xét duyệt.");
    }

    @Override
    public void sendProviderApprovedEmail(String toEmail, String temporaryPassword) {
        send(toEmail, "Nestify — Hồ sơ nhà cung cấp đã được duyệt",
                "Tài khoản: " + toEmail + "\nMật khẩu tạm: " + temporaryPassword
                        + "\nVui lòng đổi mật khẩu ngay trong lần đăng nhập đầu tiên.");
    }

    @Override
    public void sendProviderRejectedEmail(String toEmail, String reason) {
        send(toEmail, "Nestify — Hồ sơ nhà cung cấp bị từ chối",
                "Hồ sơ đăng ký nhà cung cấp của bạn đã bị từ chối.\nLý do: " + reason
                        + "\nBạn có thể bổ sung thông tin và nộp hồ sơ mới với cùng email.",
                "Chưa gửi được email kết quả xét duyệt. Vui lòng thử lại sau.");
    }

    @Override
    public void sendProviderCredentialsReissuedEmail(String toEmail, String temporaryPassword) {
        send(toEmail, "Nestify — Cấp lại mật khẩu tạm cho nhà cung cấp",
                "Tài khoản: " + toEmail + "\nMật khẩu tạm: " + temporaryPassword
                        + "\nCác mật khẩu tạm đã cấp trước lần này hết hiệu lực."
                        + "\nVui lòng đổi mật khẩu ngay trong lần đăng nhập đầu tiên.",
                "Chưa gửi được email cấp lại mật khẩu tạm. Vui lòng thử lại sau.");
    }

    private void sendOtp(String to, String title, String otp, String instructions) {
        String encoding = StandardCharsets.UTF_8.name();
        String html = verificationTemplate
                .replace("{{title}}", HtmlUtils.htmlEscape(title, encoding))
                .replace("{{instructions}}", HtmlUtils.htmlEscape(instructions, encoding))
                .replace("{{otp}}", HtmlUtils.htmlEscape(otp, encoding));
        String plainText = """
                %s

                %s

                Mã xác thực: %s
                Có hiệu lực tối đa 10 phút.

                Không chia sẻ mã này với bất kỳ ai.
                Nếu bạn không yêu cầu mã này, hãy bỏ qua email.
                """.formatted(title, instructions, otp);

        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper headers = new MimeMessageHelper(message, encoding);
            headers.setFrom(from);
            headers.setTo(to);
            headers.setSubject("Nestify — " + title);

            MimeBodyPart plainPart = new MimeBodyPart();
            plainPart.setText(plainText, encoding);
            MimeBodyPart htmlPart = new MimeBodyPart();
            htmlPart.setText(html, encoding, "html");
            MimeMultipart body = new MimeMultipart("alternative");
            body.addBodyPart(plainPart);
            body.addBodyPart(htmlPart);
            message.setContent(body);
            sender.send(message);
        } catch (MailException | MessagingException exception) {
            throw new AuthException(HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_DELIVERY_FAILED", VERIFICATION_DELIVERY_FAILURE);
        }
    }

    private void send(String to, String subject, String text) {
        send(to, subject, text, VERIFICATION_DELIVERY_FAILURE);
    }

    private void send(String to, String subject, String text, String failureMessage) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        try {
            sender.send(message);
        } catch (MailException exception) {
            // Do not expose SMTP details, credentials or message bodies (which contain secrets).
            throw new AuthException(HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_DELIVERY_FAILED", failureMessage);
        }
    }
}
