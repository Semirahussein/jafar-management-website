package com.jafar.management.integration;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * AUTH-001..010: exercises the real /api/auth endpoints, the real AuthenticationManager +
 * DaoAuthenticationProvider, the real HttpSession-backed SecurityContextRepository, and the
 * real CookieCsrfTokenRepository / CsrfFilter.
 */
class AuthIntegrationTest extends IntegrationTestBase {

    // AUTH-001
    @Test
    void loginWithValidCredentialsCreatesSessionAndReturnsSessionUser() throws Exception {
        String rawPassword = "Password123456";
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, createBranch("auth-branch").getId(), rawPassword);

        MvcResult result = mockMvc.perform(post("/api/auth/login").with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + teacher.getUsername() + "\",\"password\":\"" + rawPassword + "\",\"rememberMe\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(teacher.getUsername()))
                .andExpect(jsonPath("$.role").value("QURAN_TEACHER"))
                .andReturn();

        assertNotNull(result.getRequest().getSession(false), "A session must be created on successful login");
        // TokenBasedRememberMeServices.loginFail() issues a clearing cookie (Max-Age=0) rather than omitting
        // it entirely; absence of a *persistent* cookie is what matters here.
        var rememberMeCookie = result.getResponse().getCookie("remember-me");
        if (rememberMeCookie != null) {
            org.junit.jupiter.api.Assertions.assertTrue(rememberMeCookie.getMaxAge() <= 0,
                    "remember-me cookie must not be persistent when rememberMe=false");
        }
    }

    // AUTH-002
    @Test
    void loginWithWrongPasswordReturns401WithGenericMessage() throws Exception {
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, null, "Password123456");

        mockMvc.perform(post("/api/auth/login").with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + teacher.getUsername() + "\",\"password\":\"wrongpass\",\"rememberMe\":false}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("The username or password is incorrect."));
    }

    // AUTH-003
    @Test
    void loginWithInactiveAccountReturns401WithInactiveMessage() throws Exception {
        AppUser inactive = createInactiveUser(UserRole.QURAN_TEACHER, null, "Password123456");

        mockMvc.perform(post("/api/auth/login").with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + inactive.getUsername() + "\",\"password\":\"Password123456\",\"rememberMe\":false}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("This account is inactive. Contact an administrator."));
    }

    // AUTH-004
    @Test
    void meReturnsCurrentSessionUserAfterLogin() throws Exception {
        Long branchId = createBranch("auth-me-branch").getId();
        String rawPassword = "Password123456";
        AppUser manager = createUser(UserRole.BRANCH_MANAGER, branchId, rawPassword);
        MockHttpSession session = loginAs(manager.getUsername(), rawPassword);

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(manager.getUsername()))
                .andExpect(jsonPath("$.role").value("BRANCH_MANAGER"))
                .andExpect(jsonPath("$.branchId").value(branchId));
    }

    // AUTH-005
    @Test
    void loginWithRememberMeIssuesPersistentCookie() throws Exception {
        String rawPassword = "Password123456";
        AppUser user = createUser(UserRole.QURAN_TEACHER, null, rawPassword);

        mockMvc.perform(post("/api/auth/login").with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + user.getUsername() + "\",\"password\":\"" + rawPassword + "\",\"rememberMe\":true}"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("remember-me"))
                .andExpect(cookie().httpOnly("remember-me", true));
    }

    // AUTH-006
    @Test
    void logoutClearsSessionSoMeReturns401Afterwards() throws Exception {
        String rawPassword = "Password123456";
        AppUser user = createUser(UserRole.QURAN_TEACHER, null, rawPassword);
        MockHttpSession session = loginAs(user.getUsername(), rawPassword);

        mockMvc.perform(post("/api/auth/logout").session(session).with(withCsrf()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized());
    }

    // AUTH-007
    @Test
    void stateChangingPostWithoutCsrfTokenIsRejectedWithValidTokenAccepted() throws Exception {
        Long branchId = createBranch("csrf-admin-branch").getId();
        String rawPassword = "Password123456";
        AppUser admin = createUser(UserRole.ADMINISTRATOR, null, rawPassword);
        MockHttpSession session = loginAs(admin.getUsername(), rawPassword);

        // GET csrf token endpoint is public and returns a token.
        mockMvc.perform(get("/api/auth/csrf").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        // Without a CSRF token, a state-changing POST must be rejected.
        mockMvc.perform(post("/api/branches")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + unique("NoCsrfBranch") + "\"}"))
                .andExpect(status().isForbidden());

        // With a valid token (simulated via the real CsrfTokenRepository), the request proceeds.
        mockMvc.perform(post("/api/branches")
                        .session(session)
                        .with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + unique("WithCsrfBranch") + "\"}"))
                .andExpect(status().isOk());
    }

    // AUTH-010
    @Test
    void blankUsernameIsRejectedWithoutServerError() throws Exception {
        mockMvc.perform(post("/api/auth/login").with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"   \",\"password\":\"whatever\",\"rememberMe\":false}"))
                .andExpect(status().isBadRequest());
    }
}
