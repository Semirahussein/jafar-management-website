package com.jafar.management.integration;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Branch;
import com.jafar.management.model.Student;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** NOTIF-001..007: real @PreAuthorize + real idempotency-key uniqueness + real branch/teacher scoping. */
class ParentNotificationIntegrationTest extends IntegrationTestBase {

    // NOTIF-001
    @Test
    void createsPendingNotificationWithAutoPopulatedParentInfo() throws Exception {
        Branch branch = createBranch("notif-create-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");

        mockMvc.perform(post("/api/notifications").session(session).with(withCsrf())
                        .header("Idempotency-Key", unique("notif-key"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"studentId":%d,"notificationType":"PROGRESS_UPDATE","content":"Ahmed completed Juz 1"}
                                """.formatted(student.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deliveryStatus").value("PENDING"))
                .andExpect(jsonPath("$.parentName").value(student.getGuardianName()))
                .andExpect(jsonPath("$.parentContact").value(student.getGuardianPhone()));
    }

    // NOTIF-002
    @Test
    void rejectsNotificationForStudentWithoutGuardianContact() throws Exception {
        Branch branch = createBranch("notif-no-contact-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        student.setGuardianPhone(null);
        studentRepository.save(student);
        var session = loginAs(teacher.getUsername(), "Password123456");

        mockMvc.perform(post("/api/notifications").session(session).with(withCsrf())
                        .header("Idempotency-Key", unique("notif-key"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"studentId":%d,"notificationType":"PROGRESS_UPDATE","content":"No contact available"}
                                """.formatted(student.getId())))
                .andExpect(status().isUnprocessableEntity());
    }

    // NOTIF-003: real DB unique idempotency-key index
    @Test
    void duplicateIdempotencyKeyReturnsExistingRecordWithoutCreatingDuplicate() throws Exception {
        Branch branch = createBranch("notif-idempotency-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");
        String key = unique("idem-key");
        String body = """
                {"studentId":%d,"notificationType":"PROGRESS_UPDATE","content":"Repeated notification"}
                """.formatted(student.getId());

        var first = mockMvc.perform(post("/api/notifications").session(session).with(withCsrf())
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn();
        long firstId = objectMapper.readTree(first.getResponse().getContentAsString()).get("id").asLong();

        var second = mockMvc.perform(post("/api/notifications").session(session).with(withCsrf())
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn();
        long secondId = objectMapper.readTree(second.getResponse().getContentAsString()).get("id").asLong();

        org.junit.jupiter.api.Assertions.assertEquals(firstId, secondId);
        org.junit.jupiter.api.Assertions.assertEquals(1, parentNotificationRepository.findAllByStudentId(student.getId()).size());
    }

    // NOTIF-005
    @Test
    void notificationHistoryQueryFiltersByStudent() throws Exception {
        Branch branch = createBranch("notif-history-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student student = createStudent(branch.getId(), teacher.getId());
        var session = loginAs(teacher.getUsername(), "Password123456");
        mockMvc.perform(post("/api/notifications").session(session).with(withCsrf())
                .header("Idempotency-Key", unique("hist-key"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":" + student.getId() + ",\"notificationType\":\"GENERAL\",\"content\":\"Hello\"}"));

        mockMvc.perform(get("/api/notifications").session(session).param("studentId", student.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1));
    }

    // NOTIF-006
    @Test
    void teacherCannotViewNotificationsForStudentInAnotherBranch() throws Exception {
        Branch branch1 = createBranch("notif-scope-1");
        Branch branch2 = createBranch("notif-scope-2");
        AppUser teacher1 = createUser(UserRole.QURAN_TEACHER, branch1.getId(), "Password123456");
        AppUser teacher2 = createUser(UserRole.QURAN_TEACHER, branch2.getId(), "Password123456");
        Student studentInBranch2 = createStudent(branch2.getId(), teacher2.getId());
        var teacher2Session = loginAs(teacher2.getUsername(), "Password123456");
        var created = mockMvc.perform(post("/api/notifications").session(teacher2Session).with(withCsrf())
                        .header("Idempotency-Key", unique("scope-key"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":" + studentInBranch2.getId() + ",\"notificationType\":\"GENERAL\",\"content\":\"Hi\"}"))
                .andExpect(status().isOk())
                .andReturn();
        long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        var teacher1Session = loginAs(teacher1.getUsername(), "Password123456");
        mockMvc.perform(get("/api/notifications/" + id).session(teacher1Session))
                .andExpect(status().isForbidden());
    }
}
