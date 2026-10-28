package com.homeservice.config;

import com.homeservice.config.properties.AuthProperties;
import com.homeservice.config.properties.LoginRateLimitProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties({AuthProperties.class, LoginRateLimitProperties.class})
public class AuthConfig {
    @Bean
    Clock authClock() {
        return Clock.systemUTC();
    }
}
