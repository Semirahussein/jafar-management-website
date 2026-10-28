package com.jafar.management.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class TimeConfig {
    @Bean
    Clock applicationClock(@Value("${app.time-zone:Africa/Addis_Ababa}") String timeZone) {
        return Clock.system(ZoneId.of(timeZone));
    }
}
