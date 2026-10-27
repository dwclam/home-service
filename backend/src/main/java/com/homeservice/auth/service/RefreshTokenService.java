package com.homeservice.auth.service;

import com.homeservice.account.entity.Account;
import com.homeservice.account.enums.AccountStatus;
import com.homeservice.account.enums.AccountType;
import com.homeservice.account.repository.AccountRepository;
import com.homeservice.auth.dto.response.AccountResponse;
import com.homeservice.auth.dto.response.LoginResponse;
import com.homeservice.auth.entity.RefreshToken;
import com.homeservice.auth.exception.InvalidRefreshTokenException;
import com.homeservice.auth.repository.RefreshTokenRepository;
import com.homeservice.config.properties.JwtProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {
    private final AccountRepository accounts;
    private final RefreshTokenRepository refreshTokens;
    private final JwtTokenService jwt;
    private final TokenService tokens;
    private final JwtProperties properties;
    private final Clock clock;

    // Login holds this account's write lock before issuing/replacing refresh tokens.
    @Transactional(propagation = Propagation.MANDATORY)
    public TokenPair issueOnLogin(Account account, String previousToken) {
        Jwt previous = decodeOrNull(previousToken);
        if (previous != null && account.getId().toString().equals(previous.getSubject())) {
            RefreshToken stored = storedToken(previous, previousToken);
            if (stored != null) refreshTokens.revokeFamily(stored.getFamilyId(), clock.instant());
        }
        return issue(account, UUID.randomUUID(),
                clock.instant().truncatedTo(ChronoUnit.SECONDS).plus(properties.refreshTtl()));
    }

    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public TokenPair refresh(String rawToken) {
        Jwt decoded = decodeOrNull(rawToken);
        if (decoded == null) throw new InvalidRefreshTokenException(false);
        // All rotation/logout operations lock the account first, including across backend instances.
        Account account = accounts.findByIdForUpdate(Long.valueOf(decoded.getSubject()))
                .orElseThrow(() -> new InvalidRefreshTokenException(false));
        RefreshToken stored = storedToken(decoded, rawToken);
        if (stored == null) throw new InvalidRefreshTokenException(false);
        Instant now = clock.instant();
        if (stored.getUsedAt() != null || stored.getRevokedAt() != null) {
            refreshTokens.revokeFamily(stored.getFamilyId(), now);
            // Commit revocation even though the request returns 401.
            throw new InvalidRefreshTokenException(stored.getUsedAt() != null);
        }
        if (!stored.getExpiresAt().isAfter(now) || account.getStatus() != AccountStatus.ACTIVE
                || account.getEmailVerifiedAt() == null || account.getAccountType() != AccountType.CUSTOMER
                || Boolean.TRUE.equals(account.getMustChangePassword())) {
            refreshTokens.revokeFamily(stored.getFamilyId(), now);
            throw new InvalidRefreshTokenException(false);
        }
        stored.setUsedAt(now);
        return issue(account, stored.getFamilyId(), stored.getExpiresAt());
    }

    @Transactional
    public void logout(String rawToken) {
        Jwt decoded = decodeOrNull(rawToken);
        if (decoded == null) return;
        if (accounts.findByIdForUpdate(Long.valueOf(decoded.getSubject())).isEmpty()) return;
        RefreshToken stored = storedToken(decoded, rawToken);
        if (stored != null) refreshTokens.revokeFamily(stored.getFamilyId(), clock.instant());
    }

    private TokenPair issue(Account account, UUID family, Instant expiresAt) {
        UUID id = UUID.randomUUID();
        Jwt refresh = jwt.issueRefresh(account.getId(), id, expiresAt);
        RefreshToken stored = new RefreshToken();
        stored.setId(id);
        stored.setAccount(account);
        stored.setFamilyId(family);
        stored.setTokenHash(tokens.hashToken(refresh.getTokenValue()));
        stored.setCreatedAt(refresh.getIssuedAt());
        stored.setExpiresAt(expiresAt);
        refreshTokens.save(stored);
        Jwt access = jwt.issueAccess(account);
        return new TokenPair(new LoginResponse(AccountResponse.from(account), access.getTokenValue(),
                "Bearer", access.getExpiresAt()), refresh.getTokenValue(), expiresAt);
    }

    private RefreshToken storedToken(Jwt decoded, String rawToken) {
        return refreshTokens.findByIdAndAccountId(UUID.fromString(decoded.getId()), Long.valueOf(decoded.getSubject()))
                .filter(token -> token.getTokenHash().equals(tokens.hashToken(rawToken)))
                .filter(token -> token.getExpiresAt().equals(decoded.getExpiresAt())).orElse(null);
    }

    private Jwt decodeOrNull(String rawToken) {
        try {
            return jwt.decodeRefresh(rawToken);
        } catch (JwtException exception) {
            return null;
        }
    }

    public record TokenPair(LoginResponse response, String refreshToken, Instant refreshExpiresAt) {
        @Override
        public String toString() {
            return "TokenPair[REDACTED]";
        }
    }
}
