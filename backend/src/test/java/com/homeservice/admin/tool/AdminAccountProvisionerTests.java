package com.homeservice.admin.tool;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.auth.entity.EmailIdentity;
import com.homeservice.auth.repository.EmailIdentityRepository;
import com.homeservice.provider.entity.ProviderApplication;
import com.homeservice.provider.enums.ProviderApplicationStatus;
import com.homeservice.provider.repository.ProviderApplicationRepository;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
        "spring.config.import=",
        "spring.datasource.url=jdbc:h2:mem:admin-provisioning;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "ADMIN_EMAIL=startup-must-not-seed@example.com",
        "ADMIN_PASS=Startup-test-password-123!"
})
@ActiveProfiles("test")
class AdminAccountProvisionerTests {
    private static final Instant NOW = Instant.parse("2026-11-03T01:00:00Z");
    private static final String EMAIL = "admin@example.com";
    private static final String PASSWORD = "Admin-test-password-123!";
    @Autowired DataSource dataSource;
    @Autowired PasswordEncoder passwords;
    @Autowired Validator validator;
    @Autowired JdbcTemplate jdbc;
    @Autowired AccountRepository accounts;
    @Autowired EmailIdentityRepository identities;
    @Autowired ProviderApplicationRepository applications;
    @TempDir Path temporary;
    private AdminAccountProvisioner provisioner;

    @BeforeEach
    void setUp() {
        // Supplying admin settings must never provision an account on normal application startup.
        assertThat(accounts.findByEmail("startup-must-not-seed@example.com")).isEmpty();
        applications.deleteAllInBatch();
        accounts.deleteAllInBatch();
        identities.deleteAllInBatch();
        provisioner = new AdminAccountProvisioner(dataSource, passwords, validator, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void createsVerifiedAdminWithNormalizedEmailAndApplicationCompatibleHash() throws Exception {
        long id = provisioner.create("\u2003ADMIN@Example.COM\u2003", PASSWORD);
        Account account = accounts.findById(id).orElseThrow();
        assertThat(account.getEmail()).isEqualTo(EMAIL);
        assertThat(account.getAccountType()).isEqualTo(AccountType.ADMIN);
        assertThat(account.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(account.getDisplayName()).isEqualTo("Admin");
        assertThat(account.getMustChangePassword()).isFalse();
        assertThat(account.getEmailVerifiedAt()).isEqualTo(NOW);
        assertThat(account.getCreatedAt()).isEqualTo(NOW);
        assertThat(account.getUpdatedAt()).isEqualTo(NOW);
        assertThat(account.getPasswordHash()).startsWith("{bcrypt}").doesNotContain(PASSWORD);
        assertThat(passwords.matches(PASSWORD, account.getPasswordHash())).isTrue();
        EmailIdentity identity = identities.findById(EMAIL).orElseThrow();
        assertThat(identity.getAccountType()).isEqualTo(AccountType.ADMIN);
        assertThat(identity.getCreatedAt()).isEqualTo(NOW);
        assertThat(identity.getUpdatedAt()).isEqualTo(NOW);
        assertThat(applications.count()).isZero();
    }

    @ParameterizedTest
    @EnumSource(AccountType.class)
    void refusesExistingAccountsOfEveryRoleWithoutChangingCredentials(AccountType role) throws Exception {
        identities.saveAndFlush(new EmailIdentity(EMAIL, role));
        Account old = new Account();
        old.setEmail(EMAIL);
        old.setAccountType(role);
        old.setPasswordHash("original-hash");
        old.setDisplayName("Original");
        old.setStatus(AccountStatus.PENDING_EMAIL);
        accounts.saveAndFlush(old);
        assertThatThrownBy(() -> provisioner.create(" ADMIN@EXAMPLE.COM ", PASSWORD))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Email đã được sử dụng");
        Account preserved = accounts.findById(old.getId()).orElseThrow();
        assertThat(preserved.getAccountType()).isEqualTo(role);
        assertThat(preserved.getPasswordHash()).isEqualTo("original-hash");
        assertThat(preserved.getStatus()).isEqualTo(AccountStatus.PENDING_EMAIL);
        assertThat(accounts.count()).isEqualTo(1);
        assertThat(identities.count()).isEqualTo(1);
    }

    @Test
    void refusesIdentityReservationsAndProviderHistoryEvenWhenIdentityIsMissing() throws Exception {
        identities.saveAndFlush(new EmailIdentity(EMAIL, AccountType.PROVIDER));
        assertThatThrownBy(() -> provisioner.create(EMAIL, PASSWORD)).isInstanceOf(IllegalArgumentException.class);
        assertThat(accounts.count()).isZero();
        identities.deleteAllInBatch();
        ProviderApplication history = new ProviderApplication();
        history.setEmail(EMAIL);
        history.setApplicantName("Applicant");
        history.setPhone("0901234567");
        history.setBusinessName("Business");
        history.setCity("City");
        history.setDescription("Description");
        history.setDocumentUrl("https://drive.google.com/test");
        history.setStatus(ProviderApplicationStatus.REJECTED);
        applications.saveAndFlush(history);
        assertThatThrownBy(() -> provisioner.create(EMAIL, PASSWORD)).isInstanceOf(IllegalArgumentException.class);
        assertThat(applications.existsById(history.getId())).isTrue();
        assertThat(accounts.count()).isZero();
        assertThat(identities.count()).isZero();
    }

    @Test
    void rejectsInvalidInputsBeforeOpeningDatabaseConnectionAndEnforcesByteLimit() throws Exception {
        DataSource unopened = mock(DataSource.class);
        var tool = new AdminAccountProvisioner(unopened, passwords, validator, Clock.fixed(NOW, ZoneOffset.UTC));
        for (String invalid : new String[]{null, "", "not-email", "a".repeat(255) + "@example.com"})
            assertThatThrownBy(() -> tool.create(invalid, PASSWORD)).isInstanceOf(IllegalArgumentException.class);
        for (String invalid : new String[]{null, "", "short", " ".repeat(8), "a".repeat(73), "ấ".repeat(25)})
            assertThatThrownBy(() -> tool.create(EMAIL, invalid)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(unopened);
        long id = provisioner.create(EMAIL, "a".repeat(72));
        assertThat(passwords.matches("a".repeat(72), accounts.findById(id).orElseThrow().getPasswordHash())).isTrue();
    }

    @Test
    void accountInsertFailureRollsBackPreviouslyInsertedIdentity() throws Exception {
        jdbc.execute("alter table accounts add constraint ck_admin_test_failure check (display_name <> 'Admin')");
        try {
            assertThatThrownBy(() -> provisioner.create(EMAIL, PASSWORD)).isInstanceOf(SQLException.class);
            assertThat(identities.count()).isZero();
            assertThat(accounts.count()).isZero();
        } finally {
            jdbc.execute("alter table accounts drop constraint ck_admin_test_failure");
        }
        assertThat(provisioner.create(EMAIL, PASSWORD)).isPositive();
    }

    @Test
    void concurrentCommandsCannotCreateDuplicateAdminAccounts() throws Exception {
        DataSource concurrent = mock(DataSource.class);
        var barrier = new CyclicBarrier(2);
        when(concurrent.getConnection()).thenAnswer(invocation -> {
            barrier.await(5, TimeUnit.SECONDS);
            return dataSource.getConnection();
        });
        var tool = new AdminAccountProvisioner(concurrent, passwords, validator, Clock.fixed(NOW, ZoneOffset.UTC));
        Callable<Boolean> create = () -> {
            try { tool.create(EMAIL, PASSWORD); return true; }
            catch (IllegalArgumentException ex) { return false; }
            catch (SQLException ex) { assertThat(ex.getSQLState()).isEqualTo("23505"); return false; }
        };
        try (var pool = Executors.newFixedThreadPool(2)) {
            var a = pool.submit(create);
            var b = pool.submit(create);
            assertThat(List.of(a.get(10, TimeUnit.SECONDS), b.get(10, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(true, false);
        }
        assertThat(identities.count()).isEqualTo(1);
        assertThat(accounts.count()).isEqualTo(1);
    }

    @Test
    void commandReadsUtf8PropertiesWithoutExecutingShellAndPrintsNoSecrets() throws Exception {
        String password = "Mật-khẩu-$(not-a-command)'#=123";
        Path env = temporary.resolve(".env");
        Files.writeString(env, "ADMIN_EMAIL= ADMIN@EXAMPLE.COM \nADMIN_PASS=" + password
                + "\nDB_URL=jdbc:h2:mem:admin-provisioning\nDB_USERNAME=sa\nDB_PASSWORD=\n", StandardCharsets.UTF_8);
        var output = new ByteArrayOutputStream();
        var errors = new ByteArrayOutputStream();
        int status = CreateAdmin.run(env, Map.of(), new PrintStream(output), new PrintStream(errors));
        assertThat(status).isZero();
        assertThat(passwords.matches(password, accounts.findByEmail(EMAIL).orElseThrow().getPasswordHash())).isTrue();
        assertThat(output.toString(StandardCharsets.UTF_8)).contains("Đã tạo tài khoản ADMIN, ID:")
                .doesNotContain(password, "{bcrypt}", "DB_PASSWORD");
        assertThat(errors.toString(StandardCharsets.UTF_8)).isEmpty();
        assertThat(CreateAdmin.run(env, Map.of(), new PrintStream(output), new PrintStream(errors))).isEqualTo(1);
        assertThat(errors.toString(StandardCharsets.UTF_8)).doesNotContain(password, "{bcrypt}");
        assertThat(accounts.count()).isEqualTo(1);
    }

    @Test
    void environmentOverridesFileAndMissingConfigurationFailsWithoutConnecting() throws Exception {
        Path env = temporary.resolve(".env");
        Files.writeString(env, "ADMIN_EMAIL=unused@example.com\nADMIN_PASS=wrong-password\n");
        var output = new ByteArrayOutputStream();
        var errors = new ByteArrayOutputStream();
        int status = CreateAdmin.run(env, Map.of("ADMIN_EMAIL", EMAIL, "ADMIN_PASS", PASSWORD,
                "DB_URL", "jdbc:h2:mem:admin-provisioning", "DB_USERNAME", "sa"),
                new PrintStream(output), new PrintStream(errors));
        assertThat(status).isZero();
        assertThat(accounts.findByEmail("unused@example.com")).isEmpty();
        assertThat(passwords.matches(PASSWORD, accounts.findByEmail(EMAIL).orElseThrow().getPasswordHash())).isTrue();
        int missing = CreateAdmin.run(temporary.resolve("missing.env"), Map.of(), new PrintStream(output), new PrintStream(errors));
        assertThat(missing).isEqualTo(1);
        assertThat(errors.toString(StandardCharsets.UTF_8)).contains("Thiếu cấu hình ADMIN_EMAIL").doesNotContain(PASSWORD);
    }

    @Test
    void commandDoesNotExposeDatabaseExceptionDetails() throws Exception {
        var output = new ByteArrayOutputStream();
        var errors = new ByteArrayOutputStream();
        int status = CreateAdmin.run(temporary.resolve("missing.env"), Map.of("ADMIN_EMAIL", EMAIL, "ADMIN_PASS", PASSWORD,
                "DB_URL", "jdbc:h2:mem:missing-admin-schema", "DB_USERNAME", "sa", "DB_PASSWORD", ""),
                new PrintStream(output), new PrintStream(errors));
        assertThat(status).isEqualTo(1);
        assertThat(output.toString(StandardCharsets.UTF_8)).isEmpty();
        assertThat(errors.toString(StandardCharsets.UTF_8)).contains("Không hoàn tất cấp admin")
                .doesNotContain(PASSWORD, "jdbc:", "insert into", "{bcrypt}", "SQLException");
    }

    @Test
    void commandReturnsFailureWithoutLeakingSecretsWhenAccountInsertFails() throws Exception {
        jdbc.execute("alter table accounts add constraint ck_admin_command_failure check (display_name <> 'Admin')");
        var output = new ByteArrayOutputStream();
        var errors = new ByteArrayOutputStream();
        try {
            int status = CreateAdmin.run(temporary.resolve("missing.env"), Map.of("ADMIN_EMAIL", EMAIL, "ADMIN_PASS", PASSWORD,
                    "DB_URL", "jdbc:h2:mem:admin-provisioning", "DB_USERNAME", "sa"),
                    new PrintStream(output), new PrintStream(errors));
            assertThat(status).isEqualTo(1);
            assertThat(output.toString(StandardCharsets.UTF_8)).isEmpty();
            assertThat(errors.toString(StandardCharsets.UTF_8)).contains("Không hoàn tất cấp admin")
                    .doesNotContain(PASSWORD, "{bcrypt}", "insert into");
            assertThat(identities.count()).isZero();
            assertThat(accounts.count()).isZero();
        } finally {
            jdbc.execute("alter table accounts drop constraint ck_admin_command_failure");
        }
    }
}
