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

/** STUDENT-001..010: real @PreAuthorize + real DB uniqueness + real branch/teacher scoping. */
class StudentIntegrationTest extends IntegrationTestBase {

    private String studentPayload(String fullName, String studentNumber, Long branchId, Long teacherId) {
        return """
                {"fullName":"%s","studentNumber":"%s","gender":"MALE","enrollmentDate":"%s","branchId":%s,"teacherId":%s,"currentLevel":"Beginner"}
                """.formatted(fullName, studentNumber, java.time.LocalDate.now(), branchId, teacherId == null ? "null" : teacherId);
    }

    // STUDENT-001
    @Test
    void adminRegistersValidStudent() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);
        Branch branch = createBranch("student-create-branch");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        String number = unique("STD");

        mockMvc.perform(post("/api/students").session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(studentPayload("Ahmed Test", number, branch.getId(), teacher.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.studentNumber").value(number));
    }

    // STUDENT-002
    @Test
    void duplicateStudentNumberIsRejected() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);
        Branch branch = createBranch("student-dup-branch");
        Student existing = createStudent(branch.getId(), null);

        mockMvc.perform(post("/api/students").session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(studentPayload("Another Student", existing.getStudentNumber(), branch.getId(), null)))
                .andExpect(status().isUnprocessableEntity());
    }

    // STUDENT-003
    @Test
    void crossBranchTeacherAssignmentIsRejected() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);
        Branch branch1 = createBranch("cross-branch-1");
        Branch branch2 = createBranch("cross-branch-2");
        AppUser teacherInBranch2 = createUser(UserRole.QURAN_TEACHER, branch2.getId(), "Password123456");

        mockMvc.perform(post("/api/students").session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(studentPayload("Cross Branch Student", unique("STD"), branch1.getId(), teacherInBranch2.getId())))
                .andExpect(status().isBadRequest());
    }

    // STUDENT-004
    @Test
    void nonTeacherAccountAssignmentIsRejected() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);
        Branch branch = createBranch("non-teacher-branch");
        AppUser manager = createUser(UserRole.BRANCH_MANAGER, branch.getId(), "Password123456");

        mockMvc.perform(post("/api/students").session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(studentPayload("Bad Assignment Student", unique("STD"), branch.getId(), manager.getId())))
                .andExpect(status().isBadRequest());
    }

    // STUDENT-005
    @Test
    void managerCreateAutoScopesToOwnBranch() throws Exception {
        Branch managerBranch = createBranch("manager-scope-branch");
        Branch otherBranch = createBranch("manager-scope-other");
        LoggedInUser manager = loginAsNewUser(UserRole.BRANCH_MANAGER, managerBranch.getId());

        mockMvc.perform(post("/api/students").session(manager.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(studentPayload("Scoped Student", unique("STD"), otherBranch.getId(), null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.branchId").value(managerBranch.getId()));
    }

    // STUDENT-006
    @Test
    void teacherCannotCreateStudents() throws Exception {
        Branch branch = createBranch("teacher-no-create-branch");
        LoggedInUser teacher = loginAsNewUser(UserRole.QURAN_TEACHER, branch.getId());

        mockMvc.perform(post("/api/students").session(teacher.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(studentPayload("Teacher Attempt", unique("STD"), branch.getId(), null)))
                .andExpect(status().isForbidden());
    }

    // STUDENT-007
    @Test
    void studentListingIsFilteredByRole() throws Exception {
        Branch branch1 = createBranch("listing-branch-1");
        Branch branch2 = createBranch("listing-branch-2");
        AppUser teacher = createUser(UserRole.QURAN_TEACHER, branch1.getId(), "Password123456");
        Student assigned = createStudent(branch1.getId(), teacher.getId());
        createStudent(branch1.getId(), null);
        createStudent(branch2.getId(), null);

        LoggedInUser manager = loginAsNewUser(UserRole.BRANCH_MANAGER, branch1.getId());
        mockMvc.perform(get("/api/students").session(manager.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.branchId == " + branch2.getId() + ")]").isEmpty());

        var teacherSession = loginAs(teacher.getUsername(), "Password123456");
        mockMvc.perform(get("/api/students").session(teacherSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(assigned.getId()));
    }

    // STUDENT-008
    @Test
    void futureEnrollmentDateIsRejected() throws Exception {
        LoggedInUser admin = loginAsNewUser(UserRole.ADMINISTRATOR, null);
        Branch branch = createBranch("future-enrollment-branch");
        String payload = """
                {"fullName":"Future Student","studentNumber":"%s","enrollmentDate":"%s","branchId":%d}
                """.formatted(unique("STD"), java.time.LocalDate.now().plusDays(5), branch.getId());

        mockMvc.perform(post("/api/students").session(admin.session()).with(withCsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest());
    }

    // STUDENT-009
    @Test
    void teacherCannotViewStudentAssignedToAnotherTeacher() throws Exception {
        Branch branch = createBranch("view-permission-branch");
        AppUser teacher1 = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        AppUser teacher2 = createUser(UserRole.QURAN_TEACHER, branch.getId(), "Password123456");
        Student studentForTeacher2 = createStudent(branch.getId(), teacher2.getId());
        var teacher1Session = loginAs(teacher1.getUsername(), "Password123456");

        mockMvc.perform(get("/api/students/" + studentForTeacher2.getId()).session(teacher1Session))
                .andExpect(status().isForbidden());
    }

    // STUDENT-010
    // NOTE: StudentController.delete() originally deleted a student unconditionally, with no
    // guard against existing attendance/progress/notification history even though the
    // repositories needed for that guard were already injected (used elsewhere, e.g. update()).
    // Fixed in StudentController.delete() to mirror BranchController's deletion-protection
    // pattern: reject with 409 CONFLICT when dependent records exist.
    @Test
    void studentWithExistingAttendanceCannotBeDeleted() throws Exception {
        Branch branch = createBranch("delete-protected-student-branch");
        AppUser admin = createUser(UserRole.ADMINISTRATOR, null, "Password123456");
        Student student = createStudent(branch.getId(), null);
        var attendance = new com.jafar.management.model.StudentAttendance();
        attendance.setStudentId(student.getId());
        attendance.setDate(java.time.LocalDate.now());
        attendance.setStatus(com.jafar.management.dto.enums.AttendanceStatus.PRESENT);
        attendance.setRecordedById(admin.getId());
        attendance.setBranchId(branch.getId());
        studentAttendanceRepository.save(attendance);
        var session = loginAs(admin.getUsername(), "Password123456");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/students/" + student.getId()).session(session).with(withCsrf()))
                .andExpect(status().isConflict());
    }
}
