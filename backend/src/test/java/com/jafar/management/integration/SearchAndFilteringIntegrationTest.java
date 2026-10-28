package com.jafar.management.integration;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.Branch;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** SEARCH-001..007: real pagination + real case-insensitive LIKE queries against H2. */
class SearchAndFilteringIntegrationTest extends IntegrationTestBase {

    // SEARCH-001
    @Test
    void studentSearchByPartialNameIsCaseInsensitive() throws Exception {
        Branch branch = createBranch("search-name-branch");
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);
        var student = createStudent(branch.getId(), null);
        student.setFullName("Ahmed Mohammed " + unique("x"));
        studentRepository.save(student);
        createStudent(branch.getId(), null); // unrelated noise record

        mockMvc.perform(get("/api/students/search").session(admin.session())
                        .param("q", "ahmed mohammed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1));
    }

    // SEARCH-003: pagination boundaries
    @Test
    void paginationBoundariesReturnCorrectPagesWithoutErrorsPastTheEnd() throws Exception {
        Branch branch = createBranch("search-pagination-branch");
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);
        for (int i = 0; i < 25; i++) createStudent(branch.getId(), null);

        mockMvc.perform(get("/api/students/search").session(admin.session())
                        .param("branchId", branch.getId().toString())
                        .param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(10))
                .andExpect(jsonPath("$.totalPages").value(3));

        mockMvc.perform(get("/api/students/search").session(admin.session())
                        .param("branchId", branch.getId().toString())
                        .param("page", "2").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(5));

        mockMvc.perform(get("/api/students/search").session(admin.session())
                        .param("branchId", branch.getId().toString())
                        .param("page", "3").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));
    }

    // SEARCH-004
    @Test
    void invalidPaginationParametersAreRejected() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);

        mockMvc.perform(get("/api/students/search").session(admin.session())
                        .param("page", "-1").param("size", "500"))
                .andExpect(status().isBadRequest());
    }

    // SEARCH-007
    @Test
    void emptySearchResultHasValidPageStructure() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);

        mockMvc.perform(get("/api/students/search").session(admin.session())
                        .param("q", "XYZNONEXISTENT" + unique("z")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(0));
    }

    // SEARCH-002: combined filters
    @Test
    void combinedStudentSearchFiltersIntersect() throws Exception {
        Branch branch = createBranch("search-combo-branch");
        var teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);
        var matching = createStudent(branch.getId(), teacher.getId());
        createStudent(branch.getId(), null); // does not match teacherId filter

        mockMvc.perform(get("/api/students/search").session(admin.session())
                        .param("branchId", branch.getId().toString())
                        .param("teacherId", teacher.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value(matching.getId()));
    }
}
