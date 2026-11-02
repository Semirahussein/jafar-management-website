package com.jafar.management.controller;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.rememberme.TokenBasedRememberMeServices;
import org.springframework.security.web.context.HttpRequestResponseHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AuthControllerTest {
    private final AppUser user = new AppUser("teacher", "{bcrypt}hash", UserRole.QURAN_TEACHER, 8L);
    private final RecordingContextRepository contextRepository = new RecordingContextRepository();
    private final RecordingRememberMeServices rememberMeServices = new RecordingRememberMeServices(user);
    private final RecordingCsrfTokenRepository csrfTokenRepository = new RecordingCsrfTokenRepository();

    @AfterEach
    void clearContext() { SecurityContextHolder.clearContext(); }

    @Test
    void validLoginCreatesSessionAndIssuesRememberMeOnlyWhenRequested() {
        AuthenticationManager manager = authentication -> UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities());
        AuthController controller = controller(manager);
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        var login = controller.login(new AuthController.LoginRequest("teacher", "correct-password", true), request, response);

        assertEquals(HttpStatus.OK, login.getStatusCode());
        assertEquals("teacher", ((AuthController.SessionUser) login.getBody()).username());
        assertEquals(UserRole.QURAN_TEACHER, ((AuthController.SessionUser) login.getBody()).role());
        assertEquals(1, contextRepository.savedContexts);
        assertEquals(1, rememberMeServices.issuedCookies);
        assertEquals(0, rememberMeServices.clearedCookies);
    }

    @Test
    void validLoginWithoutRememberMeDoesNotIssuePersistentCookie() {
        AuthenticationManager manager = authentication -> UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities());
        AuthController controller = controller(manager);

        var login = controller.login(new AuthController.LoginRequest("teacher", "correct-password", false),
                new MockHttpServletRequest(), new MockHttpServletResponse());

        assertEquals(HttpStatus.OK, login.getStatusCode());
        assertEquals(0, rememberMeServices.issuedCookies);
        assertEquals(1, rememberMeServices.clearedCookies);
    }

    @Test
    void signedRememberMeCookieUsesFourteenDayLifetimeAndHttpOnly() {
        TokenBasedRememberMeServices services = new TokenBasedRememberMeServices("test-signing-key", username -> user);
        services.setAlwaysRemember(true);
        services.setTokenValiditySeconds(14 * 24 * 60 * 60);
        services.setCookieCustomizer(cookie -> cookie.setHttpOnly(true));
        MockHttpServletResponse response = new MockHttpServletResponse();
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities());

        services.onLoginSuccess(new MockHttpServletRequest(), response, authentication);

        var cookie = response.getCookie("remember-me");
        assertEquals(14 * 24 * 60 * 60, cookie.getMaxAge());
        assertEquals(true, cookie.isHttpOnly());
    }

    @Test
    void invalidPasswordReturnsUnauthorizedWithoutCreatingSession() {
        AuthenticationManager manager = authentication -> { throw new BadCredentialsException("bad credentials"); };
        AuthController controller = controller(manager);
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        var login = controller.login(new AuthController.LoginRequest("teacher", "wrong", false), request, response);

        assertEquals(HttpStatus.UNAUTHORIZED, login.getStatusCode());
        assertEquals(0, contextRepository.savedContexts);
        assertEquals(1, rememberMeServices.clearedCookies);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void inactiveAccountReturnsExplicitUnauthorizedResponse() {
        AuthenticationManager manager = authentication -> { throw new DisabledException("disabled"); };
        var login = controller(manager).login(new AuthController.LoginRequest("teacher", "secret", false),
                new MockHttpServletRequest(), new MockHttpServletResponse());

        assertEquals(HttpStatus.UNAUTHORIZED, login.getStatusCode());
        assertEquals("This account is inactive. Contact an administrator.",
                ((java.util.Map<?, ?>) login.getBody()).get("message"));
    }

    @Test
    void authenticationServiceFailureReturnsUnavailableInsteadOfInvalidCredentials() {
        AuthenticationManager manager = authentication -> { throw new org.springframework.security.authentication.AuthenticationServiceException("database unavailable"); };
        var login = controller(manager).login(new AuthController.LoginRequest("teacher", "secret", false),
                new MockHttpServletRequest(), new MockHttpServletResponse());

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, login.getStatusCode());
    }

    @Test
    void logoutClearsSessionRememberMeAndCsrfCookie() {
        AuthController controller = controller(authentication -> { throw new BadCredentialsException("unused"); });
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated("teacher", null, java.util.List.of());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.getSession(true);
        MockHttpServletResponse response = new MockHttpServletResponse();

        var logout = controller.logout(authentication, request, response);

        assertEquals(HttpStatus.NO_CONTENT, logout.getStatusCode());
        assertNull(request.getSession(false));
        assertEquals(1, rememberMeServices.clearedCookies);
        assertEquals(1, csrfTokenRepository.clearedTokens);
    }

    private AuthController controller(AuthenticationManager manager) {
        return new AuthController(manager, contextRepository, rememberMeServices, csrfTokenRepository);
    }

    private static final class RecordingContextRepository implements SecurityContextRepository {
        int savedContexts;
        @Override public SecurityContext loadContext(HttpRequestResponseHolder holder) { return SecurityContextHolder.createEmptyContext(); }
        @Override public void saveContext(SecurityContext context, HttpServletRequest request, HttpServletResponse response) { savedContexts++; }
        @Override public boolean containsContext(HttpServletRequest request) { return false; }
    }

    private static final class RecordingRememberMeServices extends TokenBasedRememberMeServices {
        int issuedCookies;
        int clearedCookies;
        RecordingRememberMeServices(AppUser user) { super("unit-test-key", username -> user); }
        @Override public void onLoginSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) { issuedCookies++; }
        @Override public void loginFail(HttpServletRequest request, HttpServletResponse response) { clearedCookies++; }
        @Override public void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) { clearedCookies++; }
    }

    private static final class RecordingCsrfTokenRepository implements CsrfTokenRepository {
        int clearedTokens;
        @Override public CsrfToken generateToken(HttpServletRequest request) { return null; }
        @Override public void saveToken(CsrfToken token, HttpServletRequest request, HttpServletResponse response) { if (token == null) clearedTokens++; }
        @Override public CsrfToken loadToken(HttpServletRequest request) { return null; }
    }
}
