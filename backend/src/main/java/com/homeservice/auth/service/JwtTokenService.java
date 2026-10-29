package com.homeservice.auth.service;

import com.homeservice.account.entity.Account;
import com.homeservice.config.JwtConfig;
import com.homeservice.config.properties.JwtProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class JwtTokenService {
    private final JwtEncoder accessEncoder;
    private final JwtEncoder refreshEncoder;
    private final JwtDecoder refreshDecoder;
    private final JwtProperties properties;
    private final Clock clock;

    public JwtTokenService(@Qualifier("accessJwtEncoder") JwtEncoder accessEncoder,
                           @Qualifier("refreshJwtEncoder") JwtEncoder refreshEncoder,
                           @Qualifier("refreshJwtDecoder") JwtDecoder refreshDecoder,
                           JwtProperties properties, Clock clock) {
        this.accessEncoder = accessEncoder;
        this.refreshEncoder = refreshEncoder;
        this.refreshDecoder = refreshDecoder;
        this.properties = properties;
        this.clock = clock;
    }

    public Jwt issueAccess(Account account) {
        Instant now = clock.instant().truncatedTo(ChronoUnit.SECONDS);
        return accessEncoder.encode(JwtEncoderParameters.from(header(), claims(account.getId(), now,
                now.plus(properties.accessTtl()), UUID.randomUUID(), "access", JwtConfig.ACCESS_AUDIENCE)
                .claim("role", account.getAccountType().name()).build()));
    }

    public Jwt issueRefresh(Long accountId, UUID tokenId, Instant expiresAt) {
        Instant now = clock.instant().truncatedTo(ChronoUnit.SECONDS);
        return refreshEncoder.encode(JwtEncoderParameters.from(header(),
                claims(accountId, now, expiresAt, tokenId, "refresh", JwtConfig.REFRESH_AUDIENCE).build()));
    }

    public Jwt decodeRefresh(String token) {
        if (token == null || token.isBlank() || token.length() > 4096) {
            throw new BadJwtException("Missing or invalid refresh JWT");
        }
        return refreshDecoder.decode(token);
    }

    private JwsHeader header() {
        return JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
    }

    private JwtClaimsSet.Builder claims(Long accountId, Instant issuedAt, Instant expiresAt,
                                        UUID tokenId, String use, String audience) {
        return JwtClaimsSet.builder().issuer(properties.issuer()).subject(accountId.toString())
                .audience(List.of(audience)).issuedAt(issuedAt).expiresAt(expiresAt)
                .id(tokenId.toString()).claim("token_use", use);
    }
}
