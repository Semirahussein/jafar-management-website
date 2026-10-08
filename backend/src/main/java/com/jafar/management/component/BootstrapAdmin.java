package com.jafar.management.component;

import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class BootstrapAdmin implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(BootstrapAdmin.class);

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final String username;
    private final String password;

    public BootstrapAdmin(AppUserRepository users, PasswordEncoder passwordEncoder,
                          @Value("${app.bootstrap-admin.username:}") String username,
                          @Value("${app.bootstrap-admin.password:}") String password) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.username = username;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(username) || !StringUtils.hasText(password)) {
            log.warn("[BootstrapAdmin] No bootstrap admin credentials configured in properties/environment.");
            return;
        }
        String cleanUsername = username.trim();
        String cleanPassword = password.trim();

        log.info("[BootstrapAdmin] Initializing bootstrap admin user: '{}'", cleanUsername);

        users.findByUsername(" " + cleanUsername).ifPresent(oldUser -> {
            log.info("[BootstrapAdmin] Removing malformed user with leading space: '{}'", oldUser.getUsername());
            users.delete(oldUser);
            users.flush();
        });

        users.findByUsername(cleanUsername).ifPresentOrElse(
            existing -> {
                existing.setPasswordHash(passwordEncoder.encode(cleanPassword));
                existing.setActive(true);
                existing.setRole(UserRole.ADMINISTRATOR);
                users.save(existing);
                log.info("[BootstrapAdmin] Updated and synchronized credentials for admin user '{}'", cleanUsername);
            },
            () -> {
                AppUser created = users.save(new AppUser(cleanUsername, passwordEncoder.encode(cleanPassword), UserRole.ADMINISTRATOR, null));
                log.info("[BootstrapAdmin] Created new bootstrap admin user '{}' (id: {})", cleanUsername, created.getId());
            }
        );

        log.info("[BootstrapAdmin] Currently registered users in database:");
        for (AppUser u : users.findAll()) {
            log.info(" - User ID: {}, Username: '{}', Role: {}, Active: {}", u.getId(), u.getUsername(), u.getRole(), u.isActive());
        }
    }
}
