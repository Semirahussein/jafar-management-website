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

/** PROGRESS-001..008: real @PreAuthorize + real branch/teacher scoping + real DB. */
class QuranProgressIntegrationTest extends IntegrationTestBase {

    private String progressPayload(Long studentId, String surah, int start, int end, String activity, String progressStatus) {
        return """
                {"studentId":%d,"date":"%s","surahName":"%s","startAyah":%d,"endAyah":%d,"activityType":"%s","progressStatus":"%s"}
                """.formatted(studentId, LocalDate.now(), surah, start, end, activity, progressStatus);
    }

    // PROGRESS-001
    @Test
    void teacherLogsValidProgress() throws Exception {
        Branch branch = createBranch("progress-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");

        mockMvc.perform(post("/api/quran-progress").session(session).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(progressPayload(student.getId(), "Al-Baqarah", 1, 20, "MEMORIZATION", "EXCELLENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.branchId").value(branch.getId()))
                .andExpect(jsonPath("$.teacherId").value(teacher.getId()));
    }

    // PROGRESS-002
    @Test
    void invalidAyahRangeIsRejected() throws Exception {
        Branch branch = createBranch("progress-range-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");

        mockMvc.perform(post("/api/quran-progress").session(session).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(progressPayload(student.getId(), "Al-Baqarah", 25, 10, "MEMORIZATION", "EXCELLENT")))
                .andExpect(status().isBadRequest());
    }

    // PROGRESS-003
    @Test
    void nonPositiveAyahIsRejected() throws Exception {
        Branch branch = createBranch("progress-positive-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");

        mockMvc.perform(post("/api/quran-progress").session(session).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(progressPayload(student.getId(), "Al-Baqarah", 0, 5, "MEMORIZATION", "EXCELLENT")))
                .andExpect(status().isBadRequest());
    }

    // PROGRESS-004
    @Test
    void teacherCannotLogForUnassignedStudent() throws Exception {
        Branch branch = createBranch("progress-unassigned-branch");
        AppUser teacher1 = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        AppUser teacher2 = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student studentOfTeacher2 = createStudent(branch.getId(), teacher2.getId());
        var teacher1Session = loginAs(teacher1.getUsername(), "Password123456");

        mockMvc.perform(post("/api/quran-progress").session(teacher1Session).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(progressPayload(studentOfTeacher2.getId(), "Al-Fatiha", 1, 7, "RECITATION", "GOOD")))
                .andExpect(status().isForbidden());
    }

    // PROGRESS-005
    @Test
    void allSixActivityTypesSupported() throws Exception {
        Branch branch = createBranch("progress-activity-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");
        String[] types = {"NEW_LESSON", "RECITATION", "REVISION", "MEMORIZATION", "CORRECTION", "OTHER"};
        for (String type : types) {
            mockMvc.perform(post("/api/quran-progress").session(session).with(withCsrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(progressPayload(student.getId(), "Al-Ikhlas", 1, 4, type, "GOOD")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.activityType").value(type));
        }
    }

    // PROGRESS-006
    @Test
    void allFiveProgressStatusesSupported() throws Exception {
        Branch branch = createBranch("progress-status-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");
        String[] statuses = {"EXCELLENT", "GOOD", "SATISFACTORY", "NEEDS_IMPROVEMENT", "INCOMPLETE"};
        for (String progressStatus : statuses) {
            mockMvc.perform(post("/api/quran-progress").session(session).with(withCsrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(progressPayload(student.getId(), "An-Nas", 1, 6, "REVISION", progressStatus)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.progressStatus").value(progressStatus));
        }
    }

    // PROGRESS-007
    @Test
    void studentProgressHistoryIsReturned() throws Exception {
        Branch branch = createBranch("progress-history-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");
        mockMvc.perform(post("/api/quran-progress").session(session).with(withCsrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(progressPayload(student.getId(), "Al-Fatiha", 1, 7, "RECITATION", "GOOD")));

        mockMvc.perform(get("/api/quran-progress/student/" + student.getId()).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // PROGRESS-008
    @Test
    void surahNameFilteringWorks() throws Exception {
        Branch branch = createBranch("progress-surah-filter-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");
        mockMvc.perform(post("/api/quran-progress").session(session).with(withCsrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(progressPayload(student.getId(), "Al-Fatiha", 1, 7, "RECITATION", "GOOD")));
        mockMvc.perform(post("/api/quran-progress").session(session).with(withCsrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(progressPayload(student.getId(), "Al-Baqarah", 1, 10, "MEMORIZATION", "EXCELLENT")));

        mockMvc.perform(get("/api/quran-progress").session(session).param("surahName", "Baqarah"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].surahName").value("Al-Baqarah"));
    }
}
