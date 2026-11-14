package com.homeservice.admin.tool;

import com.homeservice.auth.dto.request.EmailRequest;
import jakarta.validation.Validator;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;

/** Explicitly invoked tool; deliberately not a Spring component or startup runner. */
final class AdminAccountProvisioner {
    private final DataSource dataSource;
    private final PasswordEncoder passwords;
    private final Validator validator;
    private final Clock clock;

    AdminAccountProvisioner(DataSource dataSource, PasswordEncoder passwords, Validator validator, Clock clock) {
        this.dataSource = dataSource;
        this.passwords = passwords;
        this.validator = validator;
        this.clock = clock;
    }

    long create(String email, String password) throws SQLException {
        EmailRequest request = new EmailRequest(email);
        if (!validator.validate(request).isEmpty()) {
            throw new IllegalArgumentException("ADMIN_EMAIL phải là email hợp lệ, tối đa 254 ký tự.");
        }
        if (password == null || password.isBlank() || password.length() < 8
                || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("ADMIN_PASS phải có ít nhất 8 ký tự và tối đa 72 byte UTF-8.");
        }
        String normalizedEmail = request.getEmail();
        String hash = passwords.encode(password);
        Timestamp now = Timestamp.from(clock.instant());

        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                // The identity PK also rejects concurrent reservations. Never upsert an existing user.
                try (var check = connection.prepareStatement("""
                        select email from email_identities where email = ?
                        union all select email from accounts where email = ?
                        union all select email from provider_applications where email = ?
                        """)) {
                    check.setQueryTimeout(15);
                    for (int i = 1; i <= 3; i++) check.setString(i, normalizedEmail);
                    try (var rows = check.executeQuery()) {
                        if (rows.next()) throw new IllegalArgumentException("Email đã được sử dụng; không thay đổi tài khoản hiện có.");
                    }
                }
                try (var insert = connection.prepareStatement("""
                        insert into email_identities (email, account_type, created_at, updated_at)
                        values (?, 'ADMIN', ?, ?)
                        """)) {
                    insert.setQueryTimeout(15);
                    insert.setString(1, normalizedEmail);
                    insert.setTimestamp(2, now);
                    insert.setTimestamp(3, now);
                    insert.executeUpdate();
                }
                long accountId;
                try (var insert = connection.prepareStatement("""
                        insert into accounts (email, account_type, password_hash, display_name, status,
                            email_verified_at, must_change_password, created_at, updated_at)
                        values (?, 'ADMIN', ?, 'Admin', 'ACTIVE', ?, false, ?, ?)
                        """, new String[]{"id"})) {
                    insert.setQueryTimeout(15);
                    insert.setString(1, normalizedEmail);
                    insert.setString(2, hash);
                    insert.setTimestamp(3, now);
                    insert.setTimestamp(4, now);
                    insert.setTimestamp(5, now);
                    insert.executeUpdate();
                    try (var keys = insert.getGeneratedKeys()) {
                        if (!keys.next()) throw new SQLException("Missing generated account ID");
                        accountId = keys.getLong(1);
                    }
                }
                connection.commit();
                return accountId;
            } catch (SQLException | RuntimeException ex) {
                try { connection.rollback(); }
                catch (SQLException rollbackFailure) { ex.addSuppressed(rollbackFailure); }
                throw ex;
            }
        }
    }
}
