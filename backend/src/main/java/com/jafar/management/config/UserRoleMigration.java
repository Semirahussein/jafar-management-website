package com.jafar.management.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class UserRoleMigration implements ApplicationRunner {
    private final JdbcTemplate jdbcTemplate;

    public UserRoleMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.update(
                "UPDATE app_users SET `role` = 'ADMINISTRATOR', branch_id = NULL WHERE `role` = 'CENTRAL_MANAGER'");
    }
}
