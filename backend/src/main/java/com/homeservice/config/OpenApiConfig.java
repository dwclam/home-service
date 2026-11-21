package com.homeservice.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class OpenApiConfig {

    private static final String BEARER_AUTH_SCHEME = "bearerAuth";
    private static final String CSRF_TOKEN_SCHEME = "csrfToken";

    @Bean
    OpenAPI nestifyOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Nestify Home Service API")
                        .version("v1")
                        .description("Tài liệu Swagger / OpenAPI dùng để kiểm thử API hệ thống Nestify. "
                                + "Đối với các API POST của Admin (/api/v1/admin/**), gọi trước GET /api/auth/csrf "
                                + "để trình duyệt nhận cookie XSRF-TOKEN, sau đó nhập Access JWT (bearerAuth) "
                                + "và giá trị token (csrfToken) vào nút Authorize."))
                .addSecurityItem(new SecurityRequirement()
                        .addList(BEARER_AUTH_SCHEME)
                        .addList(CSRF_TOKEN_SCHEME))
                .components(new Components()
                        .addSecuritySchemes(BEARER_AUTH_SCHEME, new SecurityScheme()
                                .name("Authorization")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Nhập Access JWT Token (không cần gõ chữ 'Bearer ')"))
                        .addSecuritySchemes(CSRF_TOKEN_SCHEME, new SecurityScheme()
                                .name("X-XSRF-TOKEN")
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .description("Giá trị trường 'token' trả về từ GET /api/auth/csrf (bắt buộc cho các POST Admin/Auth)")));
    }
}
