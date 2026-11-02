package com.jafar.management.integration;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Branch;
import com.jafar.management.model.Student;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** ATT-STUDENT-001..008: real @PreAuthorize + real unique (studentId,date) constraint + real DB. */
class StudentAttendanceIntegrationTest extends IntegrationTestBase {

    // ATT-STUDENT-001
    @Test
    void teacherRecordsAttendanceForAssignedStudent() throws Exception {
        Branch branch = createBranch("att-student-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");
        LocalDate date = LocalDate.now();

        mockMvc.perform(post("/api/student-attendance").session(session).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"studentId":%d,"date":"%s","status":"PRESENT","remarks":"On time"}
                                """.formatted(student.getId(), date)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recordedById").value(teacher.getId()))
                .andExpect(jsonPath("$.teacherId").value(teacher.getId()))
                .andExpect(jsonPath("$.branchId").value(branch.getId()));
    }

    // ATT-STUDENT-002: real DB unique constraint on (studentId, date)
    @Test
    void duplicateDailyAttendanceIsRejectedByRealConstraint() throws Exception {
        Branch branch = createBranch("att-dup-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");
        LocalDate date = LocalDate.now();
        String body = """
                {"studentId":%d,"date":"%s","status":"PRESENT","remarks":"first"}
                """.formatted(student.getId(), date);

        mockMvc.perform(post("/api/student-attendance").session(session).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/student-attendance").session(session).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
    }

    // ATT-STUDENT-003
    @Test
    void allFourAttendanceStatusesAreAccepted() throws Exception {
        Branch branch = createBranch("att-all-status-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");
        String[] statuses = {"PRESENT", "ABSENT", "LATE", "EXCUSED"};
        for (int i = 0; i < statuses.length; i++) {
            LocalDate date = LocalDate.now().minusDays(i);
            mockMvc.perform(post("/api/student-attendance").session(session).with(withCsrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"studentId":%d,"date":"%s","status":"%s"}
                                    """.formatted(student.getId(), date, statuses[i])))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value(statuses[i]));
        }
    }

    // ATT-STUDENT-004
    @Test
    void invalidAttendanceStatusEnumIsRejected() throws Exception {
        Branch branch = createBranch("att-invalid-enum-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");

        mockMvc.perform(post("/api/student-attendance").session(session).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"studentId":%d,"date":"%s","status":"UNKNOWN"}
                                """.formatted(student.getId(), LocalDate.now())))
                .andExpect(status().isBadRequest());
    }

    // ATT-STUDENT-005
    @Test
    void teacherCannotRecordForUnassignedStudent() throws Exception {
        Branch branch = createBranch("att-unassigned-branch");
        AppUser teacher1 = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        AppUser teacher2 = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student studentOfTeacher2 = createStudent(branch.getId(), teacher2.getId());
        var teacher1Session = loginAs(teacher1.getUsername(), "Password123456");

        mockMvc.perform(post("/api/student-attendance").session(teacher1Session).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"studentId":%d,"date":"%s","status":"PRESENT"}
                                """.formatted(studentOfTeacher2.getId(), LocalDate.now())))
                .andExpect(status().isForbidden());
    }

    // ATT-STUDENT-006
    @Test
    void managerRecordsAttendanceWithinOwnBranch() throws Exception {
        Branch branch = createBranch("att-manager-branch");
        Student student = createStudent(branch.getId(), null);
        LoggedInUser manager = loginAsNewUser(UserRole.BRANCH_MANAGER, branch.getId());

        mockMvc.perform(post("/api/student-attendance").session(manager.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"studentId":%d,"date":"%s","status":"PRESENT"}
                                """.formatted(student.getId(), LocalDate.now())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recordedById").value(manager.user().getId()))
                .andExpect(jsonPath("$.branchId").value(branch.getId()));
    }

    // ATT-STUDENT-007
    @Test
    void updatePermissionsAreEnforcedBetweenTeachers() throws Exception {
        Branch branch = createBranch("att-update-permission-branch");
        AppUser teacher3 = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        AppUser teacher4 = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher3.getId());
        var teacher3Session = loginAs(teacher3.getUsername(), "Password123456");
        var teacher4Session = loginAs(teacher4.getUsername(), "Password123456");

        var created = mockMvc.perform(post("/api/student-attendance").session(teacher3Session).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"studentId":%d,"date":"%s","status":"PRESENT"}
                                """.formatted(student.getId(), LocalDate.now())))
                .andExpect(status().isOk())
                .andReturn();
        Long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/student-attendance/" + id)
                        .session(teacher3Session).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"LATE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LATE"));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/student-attendance/" + id)
                        .session(teacher4Session).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ABSENT\"}"))
                .andExpect(status().isForbidden());
    }

    // ATT-STUDENT-008
    @Test
    void filterByDateRangeAndStatus() throws Exception {
        Branch branch = createBranch("att-filter-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");
        LocalDate day1 = LocalDate.now().minusDays(10);
        LocalDate day2 = LocalDate.now().minusDays(9);
        mockMvc.perform(post("/api/student-attendance").session(session).with(withCsrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":" + student.getId() + ",\"date\":\"" + day1 + "\",\"status\":\"ABSENT\"}"));
        mockMvc.perform(post("/api/student-attendance").session(session).with(withCsrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":" + student.getId() + ",\"date\":\"" + day2 + "\",\"status\":\"PRESENT\"}"));

        mockMvc.perform(get("/api/student-attendance")
                        .session(session)
                        .param("startDate", day1.toString())
                        .param("endDate", day1.toString())
                        .param("status", "ABSENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].status").value("ABSENT"));
    }
}
