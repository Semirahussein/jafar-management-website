package com.jafar.management.integration;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Branch;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * BRANCH-001..007 + SECURITY-001/002/003: real filter chain + real @PreAuthorize + real DB.
 */
class BranchSecurityIntegrationTest extends IntegrationTestBase {

    // BRANCH-001
    @Test
    void administratorCreatesBranch() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);
        String name = unique("Al-Noor Branch");

        mockMvc.perform(post("/api/branches").session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"address\":\"123 Main St\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(name))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.id").isNumber());
    }

    // BRANCH-002
    @Test
    void duplicateBranchNameCaseInsensitiveIsRejected() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);
        String name = unique("Al-Noor Branch");
        mockMvc.perform(post("/api/branches").session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/branches").session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"  " + name.toUpperCase() + "  \"}"))
                .andExpect(status().isConflict());
    }

    // BRANCH-003
    @Test
    void administratorListsAllBranches() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);
        createBranch("list-branch-a");
        createBranch("list-branch-b");

        mockMvc.perform(get("/api/branches").session(admin.session()))
                .andExpect(status().isOk());
    }

    // BRANCH-004 / SECURITY-003
    @Test
    void branchManagerOnlySeesOwnBranch() throws Exception {
        Branch own = createBranch("manager-own-branch");
        createBranch("other-branch");
        LoggedInUser manager = loginAsNewUser(UserRole.BRANCH_MANAGER, own.getId());

        mockMvc.perform(get("/api/branches").session(manager.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(own.getId()));
    }

    // BRANCH-005
    @Test
    void branchManagerForbiddenFromOtherBranchById() throws Exception {
        Branch own = createBranch("mgr-forbidden-own");
        Branch other = createBranch("mgr-forbidden-other");
        LoggedInUser manager = loginAsNewUser(UserRole.BRANCH_MANAGER, own.getId());

        mockMvc.perform(get("/api/branches/" + other.getId()).session(manager.session()))
                .andExpect(status().isForbidden());
    }

    // BRANCH-006
    @Test
    void branchWithAssociatedUsersCannotBeDeleted() throws Exception {
        Branch branch = createBranch("delete-protected-branch");
        createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);

        mockMvc.perform(delete("/api/branches/" + branch.getId()).session(admin.session()).with(withCsrf()))
                .andExpect(status().isConflict());
    }

    // BRANCH-007
    @Test
    void branchUpdateWithBlankNameFailsValidation() throws Exception {
        Branch branch = createBranch("update-blank-name");
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);

        mockMvc.perform(put("/api/branches/" + branch.getId()).session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    // SECURITY-002
    @Test
    void teacherCannotCreateBranchEvenWithValidCsrf() throws Exception {
        LoggedInUser teacher = loginAsNewUser(UserRole.QURAN_TEACHER, null);

        mockMvc.perform(post("/api/branches").session(teacher.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + unique("TeacherAttempt") + "\"}"))
                .andExpect(status().isForbidden());
    }

    // SECURITY-001
    @Test
    void unauthenticatedRequestToBranchesIsRejected() throws Exception {
        mockMvc.perform(get("/api/branches"))
                .andExpect(status().isUnauthorized());
    }
}
