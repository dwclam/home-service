package com.homeservice.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StandardResponse<T> {

    @Builder.Default
    private boolean success = true;

    private String message;

    private T data;

    @Builder.Default
    private Instant timestamp = Instant.now();

    public static <T> StandardResponse<T> success(T data) {
        return StandardResponse.<T>builder()
                .success(true)
                .message("Thao tác thành công")
                .data(data)
                .timestamp(Instant.now())
                .build();
    }

    public static <T> StandardResponse<T> success(String message, T data) {
        return StandardResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .timestamp(Instant.now())
                .build();
    }

    public static <T> StandardResponse<T> error(String message) {
        return StandardResponse.<T>builder()
                .success(false)
                .message(message)
                .data(null)
                .timestamp(Instant.now())
                .build();
    }
}
