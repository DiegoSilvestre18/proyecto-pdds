package com.tasfb2b.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. Desactivar CSRF (H2 lo necesita)
                .csrf(csrf -> csrf.disable())

                // 2. Permitir iframes (CLAVE para H2)
                .headers(headers -> headers
                        .frameOptions(frame -> frame.disable())
                )

                // 3. Permitir acceso a la consola H2
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/h2-console/**").permitAll()
                        .anyRequest().permitAll()
                );

        return http.build();
    }
}
