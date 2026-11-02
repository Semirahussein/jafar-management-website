package com.jafar.management.integration;

import com.jafar.management.dto.enums.AttendanceStatus;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Branch;
import com.jafar.management.model.Student;
import com.jafar.management.model.StudentAttendance;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** DASHBOARD-001..005: real @PreAuthorize + real aggregation queries against H2. */
class DashboardIntegrationTest extends IntegrationTestBase {

    // DASHBOARD-001
    @Test
    void administratorDashboardReturnsConsolidatedCounts() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);

        mockMvc.perform(get("/api/dashboard").session(admin.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalBranches").isNumber())
                .andExpect(jsonPath("$.totalStudents").isNumber())
                .andExpect(jsonPath("$.totalTeachers").isNumber())
                .andExpect(jsonPath("$.todayStudentAttendance").exists())
                .andExpect(jsonPath("$.todayTeacherAttendance").exists());
    }

    // DASHBOARD-002
    @Test
    void managerDashboardIsBranchScoped() throws Exception {
        Branch branch = createBranch("dash-manager-branch");
        createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        createStudent(branch.getId(), null);
        LoggedInUser manager = loginAsNewUser(UserRole.BRANCH_MANAGER, branch.getId());

        mockMvc.perform(get("/api/dashboard").session(manager.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalStudents").value(1))
                .andExpect(jsonPath("$.totalTeachers").value(1));
    }

    // DASHBOARD-003
    @Test
    void teacherDashboardShowsOnlyAssignedStudents() throws Exception {
        Branch branch = createBranch("dash-teacher-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        createStudent(branch.getId(), teacher.getId());
        createStudent(branch.getId(), teacher.getId());
        createStudent(branch.getId(), null); // unassigned, must not count
        var session = loginAs(teacher.getUsername(), "Password123456");

        mockMvc.perform(get("/api/dashboard").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedStudents").value(2));
    }

    // DASHBOARD-004
    @Test
    void emptyDatasetDashboardRendersWithZeroesNotErrors() throws Exception {
        Branch branch = createBranch("dash-empty-branch");
        LoggedInUser manager = loginAsNewUser(UserRole.BRANCH_MANAGER, branch.getId());

        mockMvc.perform(get("/api/dashboard").session(manager.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalStudents").value(0))
                .andExpect(jsonPath("$.todayStudentAttendance.total").value(0))
                .andExpect(jsonPath("$.todayStudentAttendance.present").value(0));
    }

    // DASHBOARD-005
    @Test
    void attendanceStatsCalculationIsAccurate() throws Exception {
        Branch branch = createBranch("dash-stats-branch");
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);
        LocalDate today = LocalDate.now();
        AttendanceStatus[] plan = {
                AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT,
                AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT,
                AttendanceStatus.ABSENT, AttendanceStatus.LATE, AttendanceStatus.EXCUSED
        };
        for (AttendanceStatus status : plan) {
            Student student = createStudent(branch.getId(), null);
            StudentAttendance attendance = new StudentAttendance();
            attendance.setStudentId(student.getId());
            attendance.setDate(today);
            attendance.setStatus(status);
            attendance.setRecordedById(admin.user().getId());
            attendance.setBranchId(branch.getId());
            studentAttendanceRepository.save(attendance);
        }

        mockMvc.perform(get("/api/dashboard").session(loginAsNewUser(UserRole.BRANCH_MANAGER, branch.getId()).session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.todayStudentAttendance.present").value(7))
                .andExpect(jsonPath("$.todayStudentAttendance.absent").value(1))
                .andExpect(jsonPath("$.todayStudentAttendance.late").value(1))
                .andExpect(jsonPath("$.todayStudentAttendance.excused").value(1))
                .andExpect(jsonPath("$.todayStudentAttendance.total").value(10));
    }
}
