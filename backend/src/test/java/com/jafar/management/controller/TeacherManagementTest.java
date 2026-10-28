package com.jafar.management.controller;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Branch;
import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.repository.BranchRepository;
import com.jafar.management.repository.StudentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class TeacherManagementTest {
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Test
    void createsTeacherProfileOnSingleLoginAccountAndStoresPasswordAsHash() {
        AtomicReference<AppUser> saved = new AtomicReference<>();
        AppUserRepository users = users((proxy, method, args) -> switch (method.getName()) {
            case "existsByUsername" -> false;
            case "save" -> { saved.set((AppUser) args[0]); yield args[0]; }
            default -> null;
        });
        UserController controller = new UserController(users, branches(true), encoder, students(false));

        var view = controller.create(new UserController.CreateUserRequest("qteacher", "long-password-123", UserRole.QURAN_TEACHER, 4L, "Amina Yusuf", "amina@example.test", "+251900000000"));

        assertEquals("Amina Yusuf", view.fullName());
        assertEquals("amina@example.test", view.email());
        assertEquals(4L, view.branchId());
        assertTrue(encoder.matches("long-password-123", saved.get().getPassword()));
        assertNotEquals("long-password-123", saved.get().getPassword());
    }

    @Test
    void rejectsDuplicateUsernameAndInvalidBranch() {
        UserController duplicates = new UserController(users((proxy, method, args) -> method.getName().equals("existsByUsername")), branches(true), encoder, students(false));
        UserController badBranch = new UserController(users((proxy, method, args) -> false), branches(false), encoder, students(false));
        var request = new UserController.CreateUserRequest("same", "long-password-123", UserRole.QURAN_TEACHER, 4L, "Teacher", null, null);
        assertThrows(ResponseStatusException.class, () -> duplicates.create(request));
        assertThrows(ResponseStatusException.class, () -> badBranch.create(request));
    }

    @Test
    void rejectsNewUserAssignmentToInactiveBranch() {
        Branch inactive = new Branch(); inactive.setActive(false);
        BranchRepository branchRepository = proxy(BranchRepository.class, (proxy, method, args) ->
                method.getName().equals("findById") ? Optional.of(inactive) : null);
        UserController controller = new UserController(users((proxy, method, args) -> false), branchRepository,
                encoder, students(false));
        var request = new UserController.CreateUserRequest("newteacher", "long-password-123", UserRole.QURAN_TEACHER,
                4L, "Teacher", null, null);

        assertThrows(ResponseStatusException.class, () -> controller.create(request));
    }

    @Test
    void teacherWithAssignedStudentsCannotBeMovedToAnotherBranch() throws Exception {
        AppUser teacher = new AppUser("qteacher", "hash", UserRole.QURAN_TEACHER, 4L);
        var id = AppUser.class.getDeclaredField("id"); id.setAccessible(true); id.set(teacher, 7L);
        UserController controller = new UserController(users((proxy, method, args) -> switch (method.getName()) {
            case "findById" -> Optional.of(teacher);
            case "existsByUsernameAndIdNot" -> false;
            default -> null;
        }), branches(true), encoder, students(true));
        var request = new UserController.UpdateUserRequest("qteacher", null, UserRole.QURAN_TEACHER,
                5L, true, "Teacher", null, null);

        assertThrows(ResponseStatusException.class, () -> controller.update(7L, request,
                new AppUser("admin", "hash", UserRole.ADMINISTRATOR, null)));
        assertEquals(4L, teacher.getBranchId());
    }

    @Test
    void teacherSearchScopesManagerToOwnActiveBranch() {
        AtomicReference<Object[]> args = new AtomicReference<>();
        UserController controller = new UserController(users((proxy, method, values) -> {
            if (method.getName().equals("searchTeachers")) {
                args.set(values); Pageable pageable = (Pageable) values[4];
                return new PageImpl<AppUser>(List.of(), pageable, 0);
            }
            return null;
        }), branches(true), encoder, students(false));
        AppUser manager = new AppUser("manager", "hash", UserRole.BRANCH_MANAGER, 12L);

        Page<UserController.UserView> result = controller.searchTeachers(manager, "  Amina ", 88L, false, 1, 20);

        assertEquals(0, result.getTotalElements());
        assertEquals(UserRole.QURAN_TEACHER, args.get()[0]);
        assertEquals(12L, args.get()[1]);
        assertEquals(true, args.get()[2]);
        assertEquals("Amina", args.get()[3]);
        assertEquals(1, ((Pageable) args.get()[4]).getPageNumber());
    }

    @Test
    void administratorTeacherSearchAllowsUnspecifiedStatusFilter() {
        AtomicReference<Object[]> args = new AtomicReference<>();
        UserController controller = new UserController(users((proxy, method, values) -> {
            if (method.getName().equals("searchTeachers")) {
                args.set(values); Pageable pageable = (Pageable) values[4];
                return new PageImpl<AppUser>(List.of(), pageable, 0);
            }
            return null;
        }), branches(true), encoder, students(false));
        AppUser admin = new AppUser("admin", "hash", UserRole.ADMINISTRATOR, null);

        controller.searchTeachers(admin, null, null, null, 0, 10);

        assertEquals(null, args.get()[2]);
    }

    @Test
    void profileRouteRejectsNonTeacherAndCrossBranchManagerAccess() throws Exception {
        AppUser teacher = new AppUser("qteacher", "hash", UserRole.QURAN_TEACHER, 4L);
        var id = AppUser.class.getDeclaredField("id"); id.setAccessible(true); id.set(teacher, 7L);
        UserController controller = new UserController(users((proxy, method, args) -> method.getName().equals("findById") ? Optional.of(teacher) : null), branches(true), encoder, students(false));
        AppUser manager = new AppUser("manager", "hash", UserRole.BRANCH_MANAGER, 8L);
        assertThrows(ResponseStatusException.class, () -> controller.getTeacher(7L, manager));
        AppUser admin = new AppUser("admin", "hash", UserRole.ADMINISTRATOR, null);
        assertEquals(7L, controller.getTeacher(7L, admin).id());
    }

    private AppUserRepository users(java.lang.reflect.InvocationHandler handler) { return proxy(AppUserRepository.class, handler); }
    private BranchRepository branches(boolean exists) {
        Branch activeBranch = new Branch();
        return proxy(BranchRepository.class, (proxy, method, args) -> switch (method.getName()) {
            case "existsById" -> exists;
            case "findById" -> exists ? Optional.of(activeBranch) : Optional.empty();
            default -> null;
        });
    }
    private StudentRepository students(boolean assigned) { return proxy(StudentRepository.class, (proxy, method, args) -> method.getName().equals("existsByTeacherId") && assigned); }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, java.lang.reflect.InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler);
    }
}
