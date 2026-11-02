package com.jafar.management.controller;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Student;
import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.repository.BranchRepository;
import com.jafar.management.repository.StudentRepository;
import com.jafar.management.repository.StudentAttendanceRepository;
import com.jafar.management.repository.QuranProgressRepository;
import com.jafar.management.repository.ParentNotificationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Proxy;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class StudentControllerSearchTest {
    @Test
    void branchManagerSearchKeepsBranchScopeAndAppliesFiltersAndPagination() {
        AtomicReference<Object[]> arguments = new AtomicReference<>();
        StudentController controller = controller(arguments);
        AppUser manager = new AppUser("manager", "hash", UserRole.BRANCH_MANAGER, 17L);

        Page<Student> result = controller.search(manager, "  Amal  ", 99L, 43L, " Teacher ", 2, 25);

        assertEquals(0, result.getTotalElements());
        assertEquals(17L, arguments.get()[0]);
        assertEquals(null, arguments.get()[1]);
        assertEquals(99L, arguments.get()[2]);
        assertEquals(43L, arguments.get()[3]);
        assertEquals("Teacher", arguments.get()[4]);
        assertEquals("Amal", arguments.get()[5]);
        Pageable pageable = (Pageable) arguments.get()[6];
        assertEquals(2, pageable.getPageNumber());
        assertEquals(25, pageable.getPageSize());
    }

    @Test
    void teacherSearchAlwaysScopesToAuthenticatedTeacher() throws Exception {
        AtomicReference<Object[]> arguments = new AtomicReference<>();
        StudentController controller = controller(arguments);
        AppUser teacher = new AppUser("teacher", "hash", UserRole.QURAN_TEACHER, 17L);
        var id = AppUser.class.getDeclaredField("id");
        id.setAccessible(true);
        id.set(teacher, 42L);

        controller.search(teacher, "ST-", 99L, 43L, "Tutor", 0, 10);

        assertEquals(null, arguments.get()[0]);
        assertEquals(42L, arguments.get()[1]);
        assertEquals(99L, arguments.get()[2]);
        assertEquals(43L, arguments.get()[3]);
    }

    @Test
    void invalidPaginationAndUnassignedBranchManagerAreRejected() {
        StudentController controller = controller(new AtomicReference<>());
        AppUser admin = new AppUser("admin", "hash", UserRole.ADMINISTRATOR, null);
        AppUser unassignedManager = new AppUser("manager", "hash", UserRole.BRANCH_MANAGER, null);

        assertThrows(ResponseStatusException.class, () -> controller.search(admin, null, null, null, null, 0, 101));
        assertThrows(ResponseStatusException.class, () -> controller.search(unassignedManager, null, null, null, null, 0, 10));
    }

    private StudentController controller(AtomicReference<Object[]> arguments) {
        StudentRepository students = proxy(StudentRepository.class, (proxy, method, args) -> {
            if (method.getName().equals("searchStudents")) {
                arguments.set(args);
                Pageable pageable = (Pageable) args[6];
                return new PageImpl<>(List.of(), pageable, 0);
            }
            return null;
        });
        BranchRepository branches = proxy(BranchRepository.class, (proxy, method, args) -> false);
        AppUserRepository users = proxy(AppUserRepository.class, (proxy, method, args) -> null);
        return new StudentController(students, branches, users,
                proxy(StudentAttendanceRepository.class, (proxy, method, args) -> false),
                proxy(QuranProgressRepository.class, (proxy, method, args) -> false),
                proxy(ParentNotificationRepository.class, (proxy, method, args) -> false));
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, java.lang.reflect.InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler);
    }
}
