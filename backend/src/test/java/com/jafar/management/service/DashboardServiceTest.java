package com.jafar.management.service;

import com.jafar.management.dto.enums.AttendanceStatus;
import com.jafar.management.dto.enums.ReportStatus;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.repository.BranchRepository;
import com.jafar.management.repository.QuranProgressRepository;
import com.jafar.management.repository.ReportRepository;
import com.jafar.management.repository.StudentAttendanceRepository;
import com.jafar.management.repository.StudentRepository;
import com.jafar.management.repository.TeacherAttendanceRepository;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DashboardServiceTest {
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-26T11:00:00Z"), ZoneOffset.UTC);

    @Test
    void administratorMetricsUseActualAggregatesAndSingleDateBoundary() throws Exception {
        AtomicReference<LocalDate> queriedDate = new AtomicReference<>();
        var service = service(
                proxy(StudentRepository.class, (p, m, a) -> switch (m.getName()) {
                    case "count" -> 50L;
                    default -> null;
                }),
                proxy(AppUserRepository.class, (p, m, a) -> m.getName().equals("countByRoleAndActiveTrue") ? 6L : null),
                proxy(BranchRepository.class, (p, m, a) -> m.getName().equals("count") ? 3L : null),
                proxy(StudentAttendanceRepository.class, (p, m, a) -> {
                    if (a != null && a.length > 0 && a[0] instanceof LocalDate date) queriedDate.set(date);
                    if (m.getName().equals("countByDate")) return 8L;
                    if (m.getName().equals("countByDateAndStatus")) return statusCount((AttendanceStatus) a[1]);
                    return null;
                }),
                proxy(TeacherAttendanceRepository.class, (p, m, a) -> {
                    if (m.getName().equals("countByDate")) return 4L;
                    if (m.getName().equals("countByDateAndStatus")) return 1L;
                    return null;
                }),
                proxy(QuranProgressRepository.class, (p, m, a) -> m.getName().equals("findTop10ByOrderByCreatedAtDesc") ? List.of() : null),
                proxy(ReportRepository.class, (p, m, a) -> m.getName().equals("countByStatus") && a[0] == ReportStatus.SUBMITTED ? 2L : null));

        var dashboard = (DashboardService.AdminDashboardDto) service.getDashboard(user(UserRole.ADMINISTRATOR, null, 1L));

        assertEquals(3L, dashboard.totalBranches());
        assertEquals(50L, dashboard.totalStudents());
        assertEquals(6L, dashboard.totalTeachers());
        assertEquals(new DashboardService.AttendanceStats(3, 2, 1, 2, 8), dashboard.todayStudentAttendance());
        assertEquals(4L, dashboard.todayTeacherAttendance().total());
        assertEquals(2L, dashboard.pendingReports());
        assertEquals(TODAY, queriedDate.get());
    }

    @Test
    void teacherMetricsAreLimitedToAssignedClassAttendanceAndOwnReports() throws Exception {
        AtomicReference<Long> queriedTeacher = new AtomicReference<>();
        AtomicReference<LocalDate> queriedDate = new AtomicReference<>();
        var service = service(
                proxy(StudentRepository.class, (p, m, a) -> {
                    if (m.getName().equals("countByTeacherId")) { queriedTeacher.set((Long) a[0]); return 9L; }
                    return null;
                }), proxy(AppUserRepository.class, (p, m, a) -> null), proxy(BranchRepository.class, (p, m, a) -> null),
                proxy(StudentAttendanceRepository.class, (p, m, a) -> {
                    if (a != null && a.length > 1 && a[1] instanceof LocalDate date) queriedDate.set(date);
                    if (m.getName().equals("countByTeacherIdAndDate")) return 5L;
                    if (m.getName().equals("countByTeacherIdAndDateAndStatus")) return statusCount((AttendanceStatus) a[2]);
                    return null;
                }), proxy(TeacherAttendanceRepository.class, (p, m, a) -> null),
                proxy(QuranProgressRepository.class, (p, m, a) -> m.getName().equals("findTop10ByTeacherIdOrderByCreatedAtDesc") ? List.of() : null),
                proxy(ReportRepository.class, (p, m, a) -> m.getName().equals("countByAuthorIdAndStatus") && a[1] == ReportStatus.DRAFT ? 3L : null));
        AppUser teacher = user(UserRole.QURAN_TEACHER, 12L, 77L);

        var dashboard = (DashboardService.TeacherDashboardDto) service.getDashboard(teacher);

        assertEquals(9L, dashboard.assignedStudents());
        assertEquals(new DashboardService.AttendanceStats(3, 2, 1, 2, 5), dashboard.todayAttendance());
        assertEquals(3L, dashboard.pendingReports());
        assertEquals(77L, queriedTeacher.get());
        assertEquals(TODAY, queriedDate.get());
    }

    @Test
    void managerMetricsUseOnlyItsBranchAndUnassignedManagerIsDenied() throws Exception {
        AtomicReference<Long> queriedBranch = new AtomicReference<>();
        var service = service(
                proxy(StudentRepository.class, (p, m, a) -> {
                    if (m.getName().equals("countByBranchId")) { queriedBranch.set((Long) a[0]); return 12L; }
                    return null;
                }),
                proxy(AppUserRepository.class, (p, m, a) -> m.getName().equals("countByRoleAndBranchIdAndActiveTrue") ? 2L : null),
                proxy(BranchRepository.class, (p, m, a) -> null),
                proxy(StudentAttendanceRepository.class, (p, m, a) -> {
                    if (m.getName().equals("countByBranchIdAndDate")) { queriedBranch.set((Long) a[0]); return 7L; }
                    if (m.getName().equals("countByBranchIdAndDateAndStatus")) { queriedBranch.set((Long) a[0]); return 1L; }
                    return null;
                }),
                proxy(TeacherAttendanceRepository.class, (p, m, a) -> {
                    if (m.getName().equals("countByBranchIdAndDate")) { queriedBranch.set((Long) a[0]); return 2L; }
                    if (m.getName().equals("countByBranchIdAndDateAndStatus")) { queriedBranch.set((Long) a[0]); return 1L; }
                    return null;
                }),
                proxy(QuranProgressRepository.class, (p, m, a) -> m.getName().equals("findTop10ByBranchIdOrderByCreatedAtDesc") ? List.of() : null),
                proxy(ReportRepository.class, (p, m, a) -> m.getName().equals("countByBranchIdAndStatus") ? 1L : null));

        var dashboard = (DashboardService.ManagerDashboardDto) service.getDashboard(user(UserRole.BRANCH_MANAGER, 6L, 33L));

        assertEquals(12L, dashboard.totalStudents());
        assertEquals(2L, dashboard.totalTeachers());
        assertEquals(6L, queriedBranch.get());
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.getDashboard(user(UserRole.BRANCH_MANAGER, null, 33L)));
    }

    private DashboardService service(StudentRepository students, AppUserRepository users, BranchRepository branches,
            StudentAttendanceRepository studentAttendance, TeacherAttendanceRepository teacherAttendance,
            QuranProgressRepository progress, ReportRepository reports) {
        return new DashboardService(students, users, branches, studentAttendance, teacherAttendance,
                progress, reports, CLOCK);
    }

    private static long statusCount(AttendanceStatus status) {
        return switch (status) {
            case PRESENT -> 3L;
            case ABSENT -> 2L;
            case LATE -> 1L;
            case EXCUSED -> 2L;
        };
    }

    private static AppUser user(UserRole role, Long branchId, long id) throws Exception {
        AppUser user = new AppUser("test", "hash", role, branchId);
        var idField = AppUser.class.getDeclaredField("id"); idField.setAccessible(true); idField.set(user, id);
        return user;
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, java.lang.reflect.InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler);
    }
}
