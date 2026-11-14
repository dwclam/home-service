package com.homeservice.admin.tool;

import com.homeservice.config.PasswordConfig;
import jakarta.validation.Validation;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.io.IOException;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.SQLException;
import java.time.Clock;
import java.util.Map;
import java.util.Properties;

/** Plain Java entry point: no SpringApplication, component scanning, DDL or scheduled jobs. */
public final class CreateAdmin {
    private CreateAdmin() { }

    public static void main(String[] args) {
        if (args.length != 0) {
            System.err.println("Không nhận tham số. Điền ADMIN_EMAIL và ADMIN_PASS trong backend/.env.");
            System.exit(1);
        }
        System.exit(run(Path.of(".env"), System.getenv(), System.out, System.err));
    }

    static int run(Path envFile, Map<String, String> environment, PrintStream out, PrintStream err) {
        try {
            Properties values = new Properties();
            if (Files.exists(envFile)) {
                // Same .properties file format as the application's Spring config import; never source shell code.
                try (var reader = Files.newBufferedReader(envFile, StandardCharsets.UTF_8)) { values.load(reader); }
            }
            environment.forEach(values::setProperty);
            String email = required(values, "ADMIN_EMAIL");
            String password = required(values, "ADMIN_PASS");
            String url = required(values, "DB_URL");
            String username = required(values, "DB_USERNAME");
            String dbPassword = values.getProperty("DB_PASSWORD", "");
            var dataSource = new DriverManagerDataSource(url, username, dbPassword);
            try (var factory = Validation.buildDefaultValidatorFactory()) {
                var provisioner = new AdminAccountProvisioner(dataSource, PasswordConfig.passwordEncoder(),
                        factory.getValidator(), Clock.systemUTC());
                long id = provisioner.create(email, password);
                out.println("Đã tạo tài khoản ADMIN, ID: " + id);
                return 0;
            }
        } catch (IOException ex) {
            err.println("Không đọc được backend/.env. Kiểm tra đường dẫn và quyền đọc.");
        } catch (IllegalArgumentException ex) {
            // Validation messages are fixed strings; never print submitted values or JDBC exception details.
            err.println(ex.getMessage());
        } catch (SQLException ex) {
            if ("23505".equals(ex.getSQLState())) err.println("Email đã được giữ bởi yêu cầu khác; không ghi đè tài khoản.");
            else err.println("Không hoàn tất cấp admin. Kiểm tra kết nối, schema và dữ liệu trước khi chạy lại.");
        }
        return 1;
    }

    private static String required(Properties values, String key) {
        String value = values.getProperty(key);
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Thiếu cấu hình " + key + ".");
        return value;
    }
}
