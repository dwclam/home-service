package com.homeservice.provider.dto.response;

public record ProviderProfileResponse(
        Long accountId,
        String businessName,
        String bio,
        String city,
        String address,
        String logoUrl,
        boolean visible
) {}