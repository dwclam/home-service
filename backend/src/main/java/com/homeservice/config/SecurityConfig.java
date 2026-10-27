package com.homeservice.config;

import com.homeservice.config.properties.AppSecurityProperties;
import com.homeservice.security.CurrentAccount;
import com.homeservice.security.SecurityErrorHandler;
import jakarta.servlet.DispatcherType;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration(proxyBeanMethods = false)
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            UrlBasedCorsConfigurationSource corsConfigurationSource,
            CookieCsrfTokenRepository csrfTokenRepository,
            SecurityErrorHandler errorHandler,
            @Qualifier("accessJwtDecoder") JwtDecoder accessJwtDecoder
    ) throws Exception {
        var bearerTokens = new DefaultBearerTokenResolver();
        // Public cookie-based endpoints must still enforce CSRF, even with an Authorization header.
        var paths = PathPatternRequestMatcher.withDefaults();
        var cookieEndpoints = new OrRequestMatcher(paths.matcher("/api/auth/csrf"),
                paths.matcher("/api/auth/login"), paths.matcher("/api/auth/refresh"),
                paths.matcher("/api/auth/logout"), paths.matcher("/api/auth/register/customer"),
                paths.matcher("/api/auth/verify-email"), paths.matcher("/api/auth/resend-verification"));
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(csrf -> csrf.csrfTokenRepository(csrfTokenRepository))
                // Access JWTs are verified without a database lookup or servlet session.
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .oauth2ResourceServer(resource -> resource
                        .bearerTokenResolver(request -> cookieEndpoints.matches(request)
                                ? null : bearerTokens.resolve(request))
                        .jwt(jwt -> jwt.decoder(accessJwtDecoder).jwtAuthenticationConverter(token -> {
                            String role = token.getClaimAsString("role");
                            CurrentAccount account = new CurrentAccount(Long.valueOf(token.getSubject()), null, role);
                            return UsernamePasswordAuthenticationToken.authenticated(account, null,
                                    List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                        }))
                        .authenticationEntryPoint(errorHandler).accessDeniedHandler(errorHandler))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint(errorHandler)
                        .accessDeniedHandler(errorHandler))
                .authorizeHttpRequests(authorize -> authorize
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health", "/api/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register/customer",
                                "/api/auth/verify-email", "/api/auth/resend-verification", "/api/auth/logout", "/api/auth/refresh").permitAll()
                        .requestMatchers("/api/auth/me").hasRole("CUSTOMER")
                        .requestMatchers("/api/admin/**", "/api/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/provider/**", "/api/v1/provider/**").hasRole("PROVIDER")
                        .requestMatchers("/api/customer/**", "/api/v1/customer/**").hasRole("CUSTOMER")
                        .anyRequest().authenticated());
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    CookieCsrfTokenRepository csrfTokenRepository(AppSecurityProperties properties) {
        CookieCsrfTokenRepository repository = new CookieCsrfTokenRepository();
        repository.setCookiePath("/");
        // React reads the masked token from /api/auth/csrf, not from document.cookie.
        repository.setCookieCustomizer(cookie -> cookie
                .httpOnly(true)
                .secure(properties.secureCookies())
                .sameSite("Lax"));
        return repository;
    }
}
