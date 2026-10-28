package com.jafar.management.controller;

import com.jafar.management.dto.enums.AttendanceStatus;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Student;
import com.jafar.management.model.StudentAttendance;
import com.jafar.management.model.TeacherAttendance;
import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.repository.StudentAttendanceRepository;
import com.jafar.management.repository.StudentRepository;
import com.jafar.management.repository.TeacherAttendanceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Proxy;
import java.time.LocalDate;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;

class AttendanceWorkflowTest {
    @Test
    void studentAttendanceCopiesAssignmentAndRejectsSecondDailyRecord() throws Exception {
        Student student = student(1L, 9L, 4L);
        AtomicBoolean saved = new AtomicBoolean();
        StudentAttendanceRepository attendance = proxy(StudentAttendanceRepository.class, (p, m, a) -> switch (m.getName()) {
            case "existsByStudentIdAndDate" -> saved.get();
            case "saveAndFlush" -> { saved.set(true); yield a[0]; }
            default -> null;
        });
        StudentAttendanceController controller = new StudentAttendanceController(attendance,
                proxy(StudentRepository.class, (p, m, a) -> m.getName().equals("findById") ? Optional.of(student) : null));
        AppUser teacher = user("teacher", UserRole.QURAN_TEACHER, 4L, 9L);
        var request = new StudentAttendanceController.CreateStudentAttendanceRequest(1L, LocalDate.now(), AttendanceStatus.PRESENT, null);

        StudentAttendance created = controller.recordAttendance(request, teacher);
        assertEquals(9L, created.getTeacherId());
        assertEquals(4L, created.getBranchId());
        assertThrows(ResponseStatusException.class, () -> controller.recordAttendance(request, teacher));
    }

    @Test
    void teacherAttendanceRejectsOutOfBranchManagerAndDuplicateDate() throws Exception {
        AppUser teacher = user("teacher", UserRole.QURAN_TEACHER, 4L, 9L);
        AtomicBoolean saved = new AtomicBoolean();
        TeacherAttendanceRepository attendance = proxy(TeacherAttendanceRepository.class, (p, m, a) -> switch (m.getName()) {
            case "existsByTeacherIdAndDate" -> saved.get();
            case "saveAndFlush" -> { saved.set(true); yield a[0]; }
            default -> null;
        });
        TeacherAttendanceController controller = new TeacherAttendanceController(attendance,
                proxy(AppUserRepository.class, (p, m, a) -> m.getName().equals("findById") ? Optional.of(teacher) : null));
        var request = new TeacherAttendanceController.CreateTeacherAttendanceRequest(9L, LocalDate.now(), AttendanceStatus.PRESENT, null);
        AppUser otherBranch = user("manager", UserRole.BRANCH_MANAGER, 5L, 10L);
        assertThrows(ResponseStatusException.class, () -> controller.recordAttendance(request, otherBranch));
        AppUser manager = user("manager", UserRole.BRANCH_MANAGER, 4L, 10L);
        assertEquals(9L, controller.recordAttendance(request, manager).getTeacherId());
        assertThrows(ResponseStatusException.class, () -> controller.recordAttendance(request, manager));
    }

    private Student student(long id, long teacherId, long branchId) throws Exception {
        var constructor = Student.class.getDeclaredConstructor(); constructor.setAccessible(true);
        Student student = constructor.newInstance();
        var idField = Student.class.getDeclaredField("id"); idField.setAccessible(true); idField.set(student, id);
        student.setTeacherId(teacherId); student.setBranchId(branchId); return student;
    }

    private AppUser user(String name, UserRole role, long branchId, long id) throws Exception {
        AppUser user = new AppUser(name, "hash", role, branchId);
        var idField = AppUser.class.getDeclaredField("id"); idField.setAccessible(true); idField.set(user, id); return user;
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, java.lang.reflect.InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler);
    }
}
