package com.jafar.management.integration;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.Branch;
import com.jafar.management.model.Student;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SECURITY-001/002/006/007/008: exercises the real SecurityFilterChain end to end (no mocked
 * authentication of any kind) across every protected endpoint family.
 */
class SecurityFilterChainTest extends IntegrationTestBase {

    // SECURITY-001: true 401 for every protected endpoint family with zero auth
    @ParameterizedTest
    @ValueSource(strings = {
            "/api/branches", "/api/users", "/api/students", "/api/student-attendance",
            "/api/teacher-attendance", "/api/quran-progress", "/api/reports", "/api/notifications",
            "/api/dashboard", "/api/auth/me"
    })
    void everyProtectedEndpointRejectsUnauthenticatedRequests(String path) throws Exception {
        mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
    }

    // SECURITY-001: public endpoints remain reachable without auth
    @ParameterizedTest
    @ValueSource(strings = {"/api/health", "/api/auth/csrf"})
    void publicEndpointsRemainReachableWithoutAuth(String path) throws Exception {
        mockMvc.perform(get(path)).andExpect(status().isOk());
    }

    // SECURITY-002: true 403 for a logged-in QURAN_TEACHER hitting admin-only endpoints
    @Test
    void loggedInTeacherGetsForbiddenOnAdminOnlyEndpoints() throws Exception {
        LoggedInUser teacher = loginAsNewUser(UserRole.QURAN_TEACHER, null);

        mockMvc.perform(get("/api/users").session(teacher.session())).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/branches").session(teacher.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + unique("x") + "\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/users").session(teacher.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + unique("x") + "\",\"password\":\"Password123456\",\"role\":\"QURAN_TEACHER\"}"))
                .andExpect(status().isForbidden());
    }

    // SECURITY-006: SQL-injection-shaped query params return safe empty results, not errors
    @Test
    void sqlInjectionShapedSearchParamsReturnSafeEmptyResultsNotErrors() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);
        createBranch("sqli-branch");

        mockMvc.perform(get("/api/students/search").session(admin.session())
                        .param("q", "' OR '1'='1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        mockMvc.perform(get("/api/students/search").session(admin.session())
                        .param("q", "'; DROP TABLE students; --"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/branches/search").session(admin.session())
                        .param("q", "' OR '1'='1"))
                .andExpect(status().isOk());

        // Confirm the table really does still exist and is queryable after the injection attempt.
        mockMvc.perform(get("/api/students").session(admin.session())).andExpect(status().isOk());
    }

    // SECURITY-007: XSS payload is stored and returned as literal text, never executed/altered
    @Test
    void xssPayloadInRemarksIsStoredAndReturnedAsLiteralText() throws Exception {
        Branch branch = createBranch("xss-branch");
        var teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");
        String payload = "<script>alert('XSS')</script>";

        var created = mockMvc.perform(post("/api/student-attendance").session(session).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "studentId", student.getId(),
                                "date", java.time.LocalDate.now().toString(),
                                "status", "PRESENT",
                                "remarks", payload))))
                .andExpect(status().isOk())
                .andReturn();

        String storedRemarks = objectMapper.readTree(created.getResponse().getContentAsString()).get("remarks").asText();
        org.junit.jupiter.api.Assertions.assertEquals(payload, storedRemarks,
                "The literal payload must be stored verbatim, neither executed nor altered server-side");
    }

    // SECURITY-008: session id changes on successful authentication (session fixation protection)
    @Test
    void sessionIdChangesOnSuccessfulAuthentication() throws Exception {
        String rawPassword = "Password123456";
        var user = createUser(UserRole.QURAN_TEACHER, null, rawPassword);

        // Establish an anonymous session first (simulates a pre-auth session, e.g. holding a CSRF token).
        var csrfResult = mockMvc.perform(get("/api/auth/csrf")).andReturn();
        String preAuthSessionId = csrfResult.getRequest().getSession(true).getId();

        var loginResult = mockMvc.perform(post("/api/auth/login")
                        .session((org.springframework.mock.web.MockHttpSession) csrfResult.getRequest().getSession())
                        .with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + user.getUsername() + "\",\"password\":\"" + rawPassword + "\",\"rememberMe\":false}"))
                .andExpect(status().isOk())
                .andReturn();
        String postAuthSessionId = loginResult.getRequest().getSession(false).getId();

        org.junit.jupiter.api.Assertions.assertNotEquals(preAuthSessionId, postAuthSessionId,
                "Session ID must be rotated on successful authentication to prevent session fixation");
    }
}
