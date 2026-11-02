package com.jafar.management.controller;

import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Branch;
import com.jafar.management.model.Student;
import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.repository.BranchRepository;
import com.jafar.management.repository.ParentNotificationRepository;
import com.jafar.management.repository.QuranProgressRepository;
import com.jafar.management.repository.ReportRepository;
import com.jafar.management.repository.StudentAttendanceRepository;
import com.jafar.management.repository.StudentRepository;
import com.jafar.management.repository.TeacherAttendanceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class BranchManagementTest {
    @Test
    void branchCreateTrimsNameDefaultsActiveAndRejectsCaseInsensitiveDuplicates() {
        AtomicReference<Branch> saved = new AtomicReference<>();
        BranchController controller = controller((proxy, method, args) -> switch (method.getName()) {
            case "existsByNameIgnoreCase" -> "new branch".equalsIgnoreCase((String) args[0]);
            case "save" -> { saved.set((Branch) args[0]); yield args[0]; }
            default -> null;
        }, (proxy, method, args) -> false);

        Branch created = controller.create(new BranchController.BranchRequest("  North Branch ", " Address ", null));

        assertEquals("North Branch", created.getName());
        assertEquals("Address", created.getAddress());
        assertTrue(created.isActive());
        assertSame(created, saved.get());
        assertThrows(ResponseStatusException.class, () -> controller.create(
                new BranchController.BranchRequest("New Branch", null, true)));
    }

    @Test
    void assignedManagerCanOnlyListAndUpdateItsOwnBranchStatus() throws Exception {
        Branch branch = branch(4L, "North", true);
        Branch other = branch(5L, "South", true);
        BranchRepository branches = proxy(BranchRepository.class, (proxy, method, args) -> switch (method.getName()) {
            case "findById" -> Optional.ofNullable(((Long) args[0]) == 4L ? branch : other);
            case "existsByNameIgnoreCaseAndIdNot" -> false;
            case "save" -> args[0];
            default -> null;
        });
        BranchController controller = controller(Proxy.getInvocationHandler(branches), (proxy, method, args) -> false);
        AppUser manager = new AppUser("manager", "hash", UserRole.BRANCH_MANAGER, 4L);

        assertEquals(List.of(branch), controller.list(manager));
        assertThrows(ResponseStatusException.class, () -> controller.get(5L, manager));
        Branch changed = controller.update(4L, new BranchController.BranchRequest("North Branch", null, false), manager);
        assertFalse(changed.isActive());
    }

    @Test
    void branchWithHistoricalAttendanceCannotBeDeleted() throws Exception {
        Branch branch = branch(4L, "North", true);
        BranchController controller = new BranchController(
                proxy(BranchRepository.class, (proxy, method, args) -> method.getName().equals("findById") ? Optional.of(branch) : null),
                proxy(AppUserRepository.class, (proxy, method, args) -> false),
                proxy(StudentRepository.class, (proxy, method, args) -> false),
                proxy(StudentAttendanceRepository.class, (proxy, method, args) -> method.getName().equals("existsByBranchId")),
                proxy(TeacherAttendanceRepository.class, (proxy, method, args) -> false),
                proxy(QuranProgressRepository.class, (proxy, method, args) -> false),
                proxy(ReportRepository.class, (proxy, method, args) -> false),
                proxy(ParentNotificationRepository.class, (proxy, method, args) -> false));

        assertThrows(ResponseStatusException.class, () -> controller.delete(4L));
    }

    @Test
    void studentWithAttendanceCannotBeMovedAcrossBranches() throws Exception {
        Student existing = student();
        var id = Student.class.getDeclaredField("id"); id.setAccessible(true); id.set(existing, 8L);
        existing.setFullName("Student"); existing.setStudentNumber("S-8"); existing.setBranchId(4L);
        existing.setEnrollmentDate(java.time.LocalDate.now());
        StudentRepository students = proxy(StudentRepository.class, (proxy, method, args) -> switch (method.getName()) {
            case "findById" -> Optional.of(existing);
            case "existsByStudentNumberAndIdNot" -> false;
            default -> null;
        });
        StudentController controller = new StudentController(students,
                proxy(BranchRepository.class, (proxy, method, args) -> Optional.of(branch(5L, "South", true))),
                proxy(AppUserRepository.class, (proxy, method, args) -> null),
                proxy(StudentAttendanceRepository.class, (proxy, method, args) -> method.getName().equals("existsByStudentId")),
                proxy(QuranProgressRepository.class, (proxy, method, args) -> false),
                proxy(ParentNotificationRepository.class, (proxy, method, args) -> false));
        Student input = student(); input.setFullName("Student"); input.setStudentNumber("S-8");
        input.setBranchId(5L); input.setEnrollmentDate(java.time.LocalDate.now());
        AppUser admin = new AppUser("admin", "hash", UserRole.ADMINISTRATOR, null);

        assertThrows(ResponseStatusException.class, () -> controller.update(8L, input, admin));
        assertEquals(4L, existing.getBranchId());
    }

    @Test
    void newStudentCannotBeAssignedToInactiveBranch() throws Exception {
        Branch inactive = branch(5L, "South", false);
        StudentController controller = new StudentController(
                proxy(StudentRepository.class, (proxy, method, args) -> method.getName().equals("existsByStudentNumber") ? false : null),
                proxy(BranchRepository.class, (proxy, method, args) -> Optional.of(inactive)),
                proxy(AppUserRepository.class, (proxy, method, args) -> null),
                proxy(StudentAttendanceRepository.class, (proxy, method, args) -> false),
                proxy(QuranProgressRepository.class, (proxy, method, args) -> false),
                proxy(ParentNotificationRepository.class, (proxy, method, args) -> false));
        Student input = student(); input.setFullName("New student"); input.setStudentNumber("S-9");
        input.setBranchId(5L); input.setEnrollmentDate(java.time.LocalDate.now());
        AppUser admin = new AppUser("admin", "hash", UserRole.ADMINISTRATOR, null);

        assertThrows(ResponseStatusException.class, () -> controller.create(input, admin));
    }

    private BranchController controller(java.lang.reflect.InvocationHandler branchHandler,
            java.lang.reflect.InvocationHandler studentAttendanceHandler) {
        return new BranchController(proxy(BranchRepository.class, branchHandler),
                proxy(AppUserRepository.class, (proxy, method, args) -> false),
                proxy(StudentRepository.class, (proxy, method, args) -> false),
                proxy(StudentAttendanceRepository.class, studentAttendanceHandler),
                proxy(TeacherAttendanceRepository.class, (proxy, method, args) -> false),
                proxy(QuranProgressRepository.class, (proxy, method, args) -> false),
                proxy(ReportRepository.class, (proxy, method, args) -> false),
                proxy(ParentNotificationRepository.class, (proxy, method, args) -> false));
    }

    private Branch branch(long id, String name, boolean active) throws Exception {
        Branch branch = new Branch();
        var field = Branch.class.getDeclaredField("id"); field.setAccessible(true); field.set(branch, id);
        branch.setName(name); branch.setActive(active); return branch;
    }

    private Student student() throws Exception {
        var constructor = Student.class.getDeclaredConstructor(); constructor.setAccessible(true);
        return constructor.newInstance();
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, java.lang.reflect.InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler);
    }
}
