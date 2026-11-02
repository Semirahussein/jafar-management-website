package com.jafar.management.config;

import com.jafar.management.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.authentication.rememberme.TokenBasedRememberMeServices;

import java.security.SecureRandom;
import java.util.Base64;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    UserDetailsService userDetailsService(AppUserRepository users) {
        return username -> users.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    AuthenticationManager authenticationManager(UserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        HttpSessionSecurityContextRepository repository = new HttpSessionSecurityContextRepository();
        repository.setDisableUrlRewriting(true);
        return repository;
    }

    @Bean
    CsrfTokenRepository csrfTokenRepository(@Value("${app.session.cookie-secure:true}") boolean secureCookie) {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookiePath("/");
        repository.setCookieCustomizer(cookie -> cookie.sameSite("Lax").secure(secureCookie));
        return repository;
    }

    @Bean
    TokenBasedRememberMeServices rememberMeServices(UserDetailsService users,
            @Value("${app.security.remember-me-key:}") String configuredKey,
            @Value("${app.session.cookie-secure:true}") boolean secureCookie) {
        // A random development key prevents a hardcoded signing secret. Set a stable secret in production
        // if remember-me cookies must remain valid across backend restarts.
        byte[] ephemeralKey = new byte[32];
        new SecureRandom().nextBytes(ephemeralKey);
        String key = configuredKey.isBlank() ? Base64.getEncoder().encodeToString(ephemeralKey) : configuredKey;
        TokenBasedRememberMeServices services = new TokenBasedRememberMeServices(key, users);
        services.setParameter("remember-me");
        // The controller calls onLoginSuccess only when the JSON rememberMe option was checked.
        services.setAlwaysRemember(true);
        services.setTokenValiditySeconds(14 * 24 * 60 * 60);
        services.setUseSecureCookie(secureCookie);
        services.setCookieCustomizer(cookie -> {
            cookie.setHttpOnly(true);
            cookie.setAttribute("SameSite", "Lax");
        });
        return services;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityContextRepository contextRepository,
            CsrfTokenRepository csrfTokenRepository, TokenBasedRememberMeServices rememberMeServices) throws Exception {
        return http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
                .securityContext(context -> context.securityContextRepository(contextRepository))
                .sessionManagement(session -> session
                        .sessionCreationPolicy(org.springframework.security.config.http.SessionCreationPolicy.IF_REQUIRED))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/health", "/api/auth/csrf", "/api/auth/login").permitAll()
                        .anyRequest().authenticated())
                .httpBasic(Customizer.withDefaults())
                .rememberMe(remember -> remember.rememberMeServices(rememberMeServices))
                .requestCache(cache -> cache.disable())
                .build();
    }
}
