package com.jafar.management.controller;

import com.jafar.management.model.AppUser;
import com.jafar.management.service.DashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public Object getDashboard(@AuthenticationPrincipal AppUser user) {
        return dashboardService.getDashboard(user);
    }
}
