package com.homeservice.provider.mapper;

import com.homeservice.provider.dto.response.AvailabilitySlotResponse;
import com.homeservice.provider.entity.ProviderAvailability;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ProviderAvailabilityMapper {

    public AvailabilitySlotResponse toResponse(ProviderAvailability entity) {
        if (entity == null) {
            return null;
        }
        return AvailabilitySlotResponse.builder()
                .id(entity.getId())
                .providerId(entity.getProvider() != null ? entity.getProvider().getAccountId() : null)
                .startsAt(entity.getStartsAt())
                .endsAt(entity.getEndsAt())
                .state(entity.getState())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public List<AvailabilitySlotResponse> toResponseList(List<ProviderAvailability> entities) {
        if (entities == null) {
            return List.of();
        }
        return entities.stream().map(this::toResponse).toList();
    }
}
