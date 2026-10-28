package com.jafar.management.controller;

import com.jafar.management.dto.enums.ActivityType;
import com.jafar.management.dto.enums.ProgressStatus;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.QuranProgress;
import com.jafar.management.model.Student;
import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.repository.QuranProgressRepository;
import com.jafar.management.repository.StudentRepository;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class QuranProgressControllerTest {
    @Test
    void listFiltersByStudentTeacherBranchSurahAndDateWithinManagerBranch() throws Exception {
        QuranProgress inRange = record(1L, 20L, 4L, "Al-Fatiha", LocalDate.of(2026, 10, 20));
        AtomicReference<Object[]> arguments = new AtomicReference<>();
        QuranProgressController controller = controller(List.of(inRange), arguments);
        AppUser manager = user("manager", UserRole.BRANCH_MANAGER, 4L, 20L);

        var result = controller.getProgressRecords(1L, 20L, 4L,
                LocalDate.of(2026, 10, 15), null, "Al-Fatiha", null, null, null, 0, 20, manager);

        assertEquals(List.of(inRange), result.getContent());
        assertEquals(4L, arguments.get()[0]);
        assertEquals(1L, arguments.get()[2]);
        assertEquals(20L, arguments.get()[3]);
        assertEquals(4L, arguments.get()[4]);
        assertEquals("Al-Fatiha", arguments.get()[7]);
        assertEquals(0, ((PageRequest) arguments.get()[11]).getPageNumber());
    }

    @Test
    void teacherListIsScopedToAuthenticatedTeacherEvenIfOtherTeacherFilterIsRequested() throws Exception {
        QuranProgress own = record(1L, 10L, 4L, "Al-Fatiha", LocalDate.now());
        QuranProgressController controller = controller(List.of(own));
        AppUser teacher = user("teacher", UserRole.QURAN_TEACHER, 4L, 10L);

        assertEquals(List.of(own), controller.getProgressRecords(null, 11L, null, null, null, null, null, null, null, 0, 20, teacher).getContent());
    }

    @Test
    void rejectsUnauthorizedStudentAndInvalidAyahRangeWhenRecording() throws Exception {
        Student student = student(7L, 10L, 4L);
        QuranProgressRepository progress = proxy(QuranProgressRepository.class, (proxy, method, args) ->
                method.getName().equals("save") ? args[0] : null);
        StudentRepository students = proxy(StudentRepository.class, (proxy, method, args) ->
                method.getName().equals("findById") ? Optional.of(student) : null);
        QuranProgressController controller = new QuranProgressController(progress, students,
                proxy(AppUserRepository.class, (proxy, method, args) -> null));
        var request = new QuranProgressController.QuranProgressRequest(7L, LocalDate.now(), "Al-Fatiha", 1, 7,
                ActivityType.RECITATION, ProgressStatus.GOOD, null);

        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> controller.createRecord(request, user("other", UserRole.QURAN_TEACHER, 4L, 11L)));
        var invalidRange = new QuranProgressController.QuranProgressRequest(7L, LocalDate.now(), "Al-Fatiha", 7, 1,
                ActivityType.RECITATION, ProgressStatus.GOOD, null);
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> controller.createRecord(invalidRange, user("assigned", UserRole.QURAN_TEACHER, 4L, 10L)));
    }

    private QuranProgressController controller(List<QuranProgress> records) {
        return controller(records, new AtomicReference<>());
    }

    private QuranProgressController controller(List<QuranProgress> records, AtomicReference<Object[]> captured) {
        QuranProgressRepository repository = proxy(QuranProgressRepository.class, (proxy, method, args) ->
                method.getName().equals("searchProgress") ? captureAndPage(records, captured, args) : null);
        return new QuranProgressController(repository,
                proxy(StudentRepository.class, (proxy, method, args) -> null),
                proxy(AppUserRepository.class, (proxy, method, args) -> null));
    }

    private Page<QuranProgress> captureAndPage(List<QuranProgress> records, AtomicReference<Object[]> captured, Object[] args) {
        captured.set(args);
        return new PageImpl<>(records, (PageRequest) args[11], records.size());
    }

    private static QuranProgress record(long id, long teacherId, long branchId, String surah, LocalDate date) throws Exception {
        QuranProgress record = new QuranProgress();
        var idField = QuranProgress.class.getDeclaredField("id"); idField.setAccessible(true); idField.set(record, id);
        record.setStudentId(id);
        record.setTeacherId(teacherId);
        record.setBranchId(branchId);
        record.setSurahName(surah);
        record.setDate(date);
        record.setStartAyah(1);
        record.setEndAyah(7);
        record.setActivityType(ActivityType.RECITATION);
        record.setProgressStatus(ProgressStatus.GOOD);
        return record;
    }

    private static Student student(long id, long teacherId, long branchId) throws Exception {
        var constructor = Student.class.getDeclaredConstructor(); constructor.setAccessible(true);
        Student student = constructor.newInstance();
        var idField = Student.class.getDeclaredField("id"); idField.setAccessible(true); idField.set(student, id);
        student.setTeacherId(teacherId); student.setBranchId(branchId);
        return student;
    }

    private static AppUser user(String name, UserRole role, long branchId, long id) throws Exception {
        AppUser user = new AppUser(name, "hash", role, branchId);
        var idField = AppUser.class.getDeclaredField("id"); idField.setAccessible(true); idField.set(user, id);
        return user;
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, java.lang.reflect.InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler);
    }
}
