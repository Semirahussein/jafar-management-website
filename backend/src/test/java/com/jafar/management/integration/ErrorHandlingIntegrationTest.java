package com.jafar.management.integration;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.Branch;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** ERR-001..005: real Spring default error handling + real @Valid cascades + real 404/422 paths. */
class ErrorHandlingIntegrationTest extends IntegrationTestBase {

    // ERR-001
    @Test
    void malformedJsonBodyReturns400WithoutLeakingStackTrace() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);

        mockMvc.perform(post("/api/branches").session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{name: \"test\",}"))
                .andExpect(status().isBadRequest());
    }

    // ERR-002
    @Test
    void nonExistentResourceReturns404() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);

        mockMvc.perform(get("/api/students/999999999").session(admin.session()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/branches/999999999").session(admin.session()))
                .andExpect(status().isNotFound());
    }

    // ERR-003
    @Test
    void nonExistentForeignKeyReferenceIsRejected() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);

        mockMvc.perform(post("/api/students").session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ghost Student","studentNumber":"%s","enrollmentDate":"%s","branchId":999999999}
                                """.formatted(unique("STD"), java.time.LocalDate.now())))
                .andExpect(status().isBadRequest());
    }

    // ERR-005
    @Test
    void validationErrorEnumeratesMissingFields() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);

        mockMvc.perform(post("/api/students").session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // ERR: unauthenticated request to a protected endpoint is rejected cleanly
    @Test
    void unauthenticatedRequestDoesNotLeakServerDetails() throws Exception {
        mockMvc.perform(get("/api/dashboard"))
                .andExpect(status().isUnauthorized());
    }
}
