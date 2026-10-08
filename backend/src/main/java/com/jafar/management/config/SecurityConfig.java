package com.jafar.management.config;

import com.jafar.management.repository.AppUserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(SecurityConfig.class);

    @Bean
    UserDetailsService userDetailsService(AppUserRepository users) {
        return username -> {
            log.info("[Auth] Authentication attempt for username: '{}'", username);
            return users.findByUsername(username)
                    .map(user -> {
                        log.info("[Auth] User found: '{}', Role: {}, Active: {}", user.getUsername(), user.getRole(), user.isActive());
                        return user;
                    })
                    .orElseThrow(() -> {
                        log.warn("[Auth] User NOT found in database: '{}'", username);
                        return new UsernameNotFoundException("User not found: " + username);
                    });
        };
    }

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/health").permitAll()
                        .anyRequest().authenticated())
                .httpBasic(Customizer.withDefaults())
                .build();
    }
}
