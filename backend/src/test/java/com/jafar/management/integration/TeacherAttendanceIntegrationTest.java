package com.jafar.management.integration;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Branch;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** ATT-TEACHER-001..006: real @PreAuthorize + real unique (teacherId,date) constraint + real DB. */
class TeacherAttendanceIntegrationTest extends IntegrationTestBase {

    // ATT-TEACHER-001
    @Test
    void managerRecordsTeacherAttendance() throws Exception {
        Branch branch = createBranch("tatt-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        LoggedInUser manager = loginAsNewUser(UserRole.BRANCH_MANAGER, branch.getId());

        mockMvc.perform(post("/api/teacher-attendance").session(manager.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"teacherId":%d,"date":"%s","status":"PRESENT","remarks":"Prompt"}
                                """.formatted(teacher.getId(), LocalDate.now())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.branchId").value(branch.getId()));
    }

    // ATT-TEACHER-002: real DB unique constraint on (teacherId, date)
    @Test
    void duplicateDailyTeacherAttendanceIsRejectedByRealConstraint() throws Exception {
        Branch branch = createBranch("tatt-dup-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        LoggedInUser manager = loginAsNewUser(UserRole.BRANCH_MANAGER, branch.getId());
        String body = """
                {"teacherId":%d,"date":"%s","status":"PRESENT"}
                """.formatted(teacher.getId(), LocalDate.now());

        mockMvc.perform(post("/api/teacher-attendance").session(manager.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/teacher-attendance").session(manager.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
    }

    // ATT-TEACHER-003
    @Test
    void managerCannotRecordAcrossBranches() throws Exception {
        Branch branch1 = createBranch("tatt-cross-1");
        Branch branch2 = createBranch("tatt-cross-2");
        AppUser teacherInBranch2 = createUser(UserRole.QURAN_TEACHER, branch2.getId(), "Password123456");
        LoggedInUser manager = loginAsNewUser(UserRole.BRANCH_MANAGER, branch1.getId());

        mockMvc.perform(post("/api/teacher-attendance").session(manager.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"teacherId":%d,"date":"%s","status":"PRESENT"}
                                """.formatted(teacherInBranch2.getId(), LocalDate.now())))
                .andExpect(status().isForbidden());
    }

    // ATT-TEACHER-004
    @Test
    void teacherCannotRecordOwnAttendance() throws Exception {
        Branch branch = createBranch("tatt-self-branch");
        LoggedInUser teacher = loginAsNewUser(UserRole.QURAN_TEACHER, branch.getId());

        mockMvc.perform(post("/api/teacher-attendance").session(teacher.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"teacherId":%d,"date":"%s","status":"PRESENT"}
                                """.formatted(teacher.user().getId(), LocalDate.now())))
                .andExpect(status().isForbidden());
    }

    // ATT-TEACHER-005
    @Test
    void administratorRecordsAcrossBranches() throws Exception {
        Branch branch1 = createBranch("tatt-admin-1");
        Branch branch2 = createBranch("tatt-admin-2");
        AppUser teacher1 = createUser(UserRole.QURAN_TEACHER, branch1.getId(), "Password123456");
        AppUser teacher2 = createUser(UserRole.QURAN_TEACHER, branch2.getId(), "Password123456");
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);

        mockMvc.perform(post("/api/teacher-attendance").session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"teacherId\":" + teacher1.getId() + ",\"date\":\"" + LocalDate.now() + "\",\"status\":\"PRESENT\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/teacher-attendance").session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"teacherId\":" + teacher2.getId() + ",\"date\":\"" + LocalDate.now() + "\",\"status\":\"PRESENT\"}"))
                .andExpect(status().isOk());
    }

    // ATT-TEACHER-006
    @Test
    void teacherAttendanceHistoryQuery() throws Exception {
        Branch branch = createBranch("tatt-history-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        LoggedInUser manager = loginAsNewUser(UserRole.BRANCH_MANAGER, branch.getId());
        mockMvc.perform(post("/api/teacher-attendance").session(manager.session()).with(withCsrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"teacherId\":" + teacher.getId() + ",\"date\":\"" + LocalDate.now() + "\",\"status\":\"PRESENT\"}"));

        mockMvc.perform(get("/api/teacher-attendance")
                        .session(manager.session())
                        .param("teacherId", teacher.getId().toString())
                        .param("startDate", LocalDate.now().toString())
                        .param("endDate", LocalDate.now().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1));
    }
}
