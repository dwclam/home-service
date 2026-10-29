package com.homeservice.auth.dto.response;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;

import java.time.Instant;

public class AccountResponse {
    private Long id;
    private String email;
    private AccountType accountType;
    private String displayName;
    private String phone;
    private AccountStatus status;
    private Instant emailVerifiedAt;
    private boolean mustChangePassword;

    public AccountResponse() {
    }

    public AccountResponse(Long id, String email, AccountType accountType, String displayName,
                           String phone, AccountStatus status, Instant emailVerifiedAt,
                           boolean mustChangePassword) {
        this.id = id;
        this.email = email;
        this.accountType = accountType;
        this.displayName = displayName;
        this.phone = phone;
        this.status = status;
        this.emailVerifiedAt = emailVerifiedAt;
        this.mustChangePassword = mustChangePassword;
    }

    public static AccountResponse from(Account account) {
        return new AccountResponse(account.getId(), account.getEmail(), account.getAccountType(),
                account.getDisplayName(), account.getPhone(), account.getStatus(), account.getEmailVerifiedAt(),
                Boolean.TRUE.equals(account.getMustChangePassword()));
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public AccountType getAccountType() {
        return accountType;
    }

    public void setAccountType(AccountType accountType) {
        this.accountType = accountType;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public void setStatus(AccountStatus status) {
        this.status = status;
    }

    public Instant getEmailVerifiedAt() {
        return emailVerifiedAt;
    }

    public void setEmailVerifiedAt(Instant emailVerifiedAt) {
        this.emailVerifiedAt = emailVerifiedAt;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    public void setMustChangePassword(boolean mustChangePassword) {
        this.mustChangePassword = mustChangePassword;
    }
}
