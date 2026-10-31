package com.jafar.management.controller;

import com.jafar.management.model.AppUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @GetMapping("/me")
    public UserProfile currentUser(@AuthenticationPrincipal AppUser user) {
        return new UserProfile(
                user.getId(),
                user.getUsername(),
                user.getRole().name(),
                user.getBranchId(),
                user.getBranchIds().stream().sorted().toList()
        );
    }

    public record UserProfile(Long id, String username, String role, Long branchId, List<Long> branchIds) {}
}
