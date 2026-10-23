package com.homeservice.security;

public class CurrentAccount {
    private Long id;
    private String email;
    private String accountType;

    public CurrentAccount() {
    }

    public CurrentAccount(Long id, String email, String accountType) {
        this.id = id;
        this.email = email;
        this.accountType = accountType;
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

    public String getAccountType() {
        return accountType;
    }

    public void setAccountType(String accountType) {
        this.accountType = accountType;
    }
}
