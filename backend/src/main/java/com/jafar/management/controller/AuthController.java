package com.jafar.management.controller;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.rememberme.TokenBasedRememberMeServices;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository contextRepository;
    private final TokenBasedRememberMeServices rememberMeServices;
    private final CsrfTokenRepository csrfTokenRepository;

    public AuthController(AuthenticationManager authenticationManager, SecurityContextRepository contextRepository,
                          TokenBasedRememberMeServices rememberMeServices, CsrfTokenRepository csrfTokenRepository) {
        this.authenticationManager = authenticationManager;
        this.contextRepository = contextRepository;
        this.rememberMeServices = rememberMeServices;
        this.csrfTokenRepository = csrfTokenRepository;
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password, boolean rememberMe) {}
    public record SessionUser(Long id, String username, UserRole role, Long branchId) {
        static SessionUser from(AppUser user) {
            return new SessionUser(user.getId(), user.getUsername(), user.getRole(), user.getBranchId());
        }
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                   jakarta.servlet.http.HttpServletRequest servletRequest,
                                   jakarta.servlet.http.HttpServletResponse servletResponse) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(request.username().trim(), request.password()));
            if (servletRequest.getSession(false) != null) servletRequest.changeSessionId();

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            contextRepository.saveContext(context, servletRequest, servletResponse);
            if (request.rememberMe()) rememberMeServices.onLoginSuccess(servletRequest, servletResponse, authentication);
            else rememberMeServices.loginFail(servletRequest, servletResponse);

            return ResponseEntity.ok(SessionUser.from((AppUser) authentication.getPrincipal()));
        } catch (AuthenticationServiceException exception) {
            SecurityContextHolder.clearContext();
            rememberMeServices.loginFail(servletRequest, servletResponse);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", "Authentication is temporarily unavailable. Try again shortly."));
        } catch (DisabledException exception) {
            SecurityContextHolder.clearContext();
            rememberMeServices.loginFail(servletRequest, servletResponse);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "This account is inactive. Contact an administrator."));
        } catch (AuthenticationException exception) {
            SecurityContextHolder.clearContext();
            rememberMeServices.loginFail(servletRequest, servletResponse);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "The username or password is incorrect."));
        }
    }

    @GetMapping("/me")
    public SessionUser currentUser(Authentication authentication) {
        return SessionUser.from((AppUser) authentication.getPrincipal());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(Authentication authentication,
                                       jakarta.servlet.http.HttpServletRequest request,
                                       jakarta.servlet.http.HttpServletResponse response) {
        rememberMeServices.logout(request, response, authentication);
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        csrfTokenRepository.saveToken(null, request, response);
        return ResponseEntity.noContent().build();
    }
}
