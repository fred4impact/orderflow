package com.example.order.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

    @Value("${cors.allow-all-origins:false}")
    private boolean allowAllOrigins;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                var corsRegistration = registry.addMapping("/api/**")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);

                if (allowAllOrigins) {
                    // Allow all origins (useful for Kubernetes deployments)
                    corsRegistration.allowedOriginPatterns("*");
                } else {
                    // Parse allowed origins from environment variable or use defaults
                    List<String> origins = Arrays.asList(allowedOrigins.split(","));
                    corsRegistration.allowedOrigins(origins.toArray(new String[0]));
                }
            }
        };
    }
}














