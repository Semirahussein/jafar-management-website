package com.jafar.management.integration;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Branch;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** REPORT-001..010: real @PreAuthorize + real DRAFT/SUBMITTED/REVIEWED workflow + real branch isolation. */
class ReportWorkflowIntegrationTest extends IntegrationTestBase {

    private Long createReport(MockHttpSession session, String reportType, LocalDate start, LocalDate end) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/reports").session(session).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Weekly Report","content":"Progress details","reportType":"%s","periodStart":"%s","periodEnd":"%s"}
                                """.formatted(reportType, start, end)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    // REPORT-001
    @Test
    void teacherCreatesDraftReport() throws Exception {
        Branch branch = createBranch("report-create-branch");
        LoggedInUser teacher = loginAsNewUser(UserRole.QURAN_TEACHER, branch.getId());

        mockMvc.perform(post("/api/reports").session(teacher.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Weekly Report","content":"...","reportType":"TEACHER_TO_MANAGER","periodStart":"2026-10-01","periodEnd":"2026-10-07"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.authorId").value(teacher.user().getId()))
                .andExpect(jsonPath("$.branchId").value(branch.getId()));
    }

    // REPORT-002
    @Test
    void teacherSubmitsReportToManager() throws Exception {
        Branch branch = createBranch("report-submit-branch");
        LoggedInUser teacher = loginAsNewUser(UserRole.QURAN_TEACHER, branch.getId());
        Long id = createReport(teacher.session(), "TEACHER_TO_MANAGER", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 7));

        mockMvc.perform(put("/api/reports/" + id + "/submit").session(teacher.session()).with(withCsrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.submittedAt").exists());
    }

    // REPORT-003
    @Test
    void submittedReportCannotBeEdited() throws Exception {
        Branch branch = createBranch("report-edit-locked-branch");
        LoggedInUser teacher = loginAsNewUser(UserRole.QURAN_TEACHER, branch.getId());
        Long id = createReport(teacher.session(), "TEACHER_TO_MANAGER", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 7));
        mockMvc.perform(put("/api/reports/" + id + "/submit").session(teacher.session()).with(withCsrf()))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/reports/" + id).session(teacher.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Changed","content":"Changed","reportType":"TEACHER_TO_MANAGER","periodStart":"2026-10-01","periodEnd":"2026-10-07"}
                                """))
                .andExpect(status().isBadRequest());
    }

    // REPORT-004
    @Test
    void managerReviewsTeacherReport() throws Exception {
        Branch branch = createBranch("report-review-branch");
        LoggedInUser teacher = loginAsNewUser(UserRole.QURAN_TEACHER, branch.getId());
        Long id = createReport(teacher.session(), "TEACHER_TO_MANAGER", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 7));
        mockMvc.perform(put("/api/reports/" + id + "/submit").session(teacher.session()).with(withCsrf()));
        LoggedInUser manager = loginAsNewUser(UserRole.BRANCH_MANAGER, branch.getId());

        mockMvc.perform(put("/api/reports/" + id + "/review").session(manager.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reviewRemarks\":\"Excellent work\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REVIEWED"))
                .andExpect(jsonPath("$.reviewedById").value(manager.user().getId()));
    }

    // REPORT-005 + REPORT-006
    @Test
    void managerCreatesSubmitsAndAdminReviewsBranchReport() throws Exception {
        Branch branch = createBranch("report-manager-admin-branch");
        LoggedInUser manager = loginAsNewUser(UserRole.BRANCH_MANAGER, branch.getId());
        Long id = createReport(manager.session(), "MANAGER_TO_ADMIN", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31));
        mockMvc.perform(put("/api/reports/" + id + "/submit").session(manager.session()).with(withCsrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"));

        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);
        mockMvc.perform(put("/api/reports/" + id + "/review").session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reviewRemarks\":\"Approved\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REVIEWED"));
    }

    // REPORT-007: branch isolation on review
    @Test
    void managerCannotReviewOtherBranchReport() throws Exception {
        Branch branch1 = createBranch("report-isolation-1");
        Branch branch2 = createBranch("report-isolation-2");
        LoggedInUser teacherInBranch2 = loginAsNewUser(UserRole.QURAN_TEACHER, branch2.getId());
        Long id = createReport(teacherInBranch2.session(), "TEACHER_TO_MANAGER", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 7));
        mockMvc.perform(put("/api/reports/" + id + "/submit").session(teacherInBranch2.session()).with(withCsrf()));

        LoggedInUser managerInBranch1 = loginAsNewUser(UserRole.BRANCH_MANAGER, branch1.getId());
        mockMvc.perform(put("/api/reports/" + id + "/review").session(managerInBranch1.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reviewRemarks\":\"Should not be allowed\"}"))
                .andExpect(status().isForbidden());
    }

    // REPORT-008
    @Test
    void periodStartAfterEndIsRejected() throws Exception {
        Branch branch = createBranch("report-period-branch");
        LoggedInUser teacher = loginAsNewUser(UserRole.QURAN_TEACHER, branch.getId());

        mockMvc.perform(post("/api/reports").session(teacher.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Bad period","content":"...","reportType":"TEACHER_TO_MANAGER","periodStart":"2026-10-10","periodEnd":"2026-10-01"}
                                """))
                .andExpect(status().isBadRequest());
    }

    // REPORT-010
    @Test
    void unsupportedExportFormatIsRejected() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/reports/export").session(admin.session()).param("format", "csv"))
                .andExpect(status().isBadRequest());
    }
}
