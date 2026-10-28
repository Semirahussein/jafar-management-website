package com.jafar.management.controller;

import com.jafar.management.dto.enums.ReportStatus;
import com.jafar.management.dto.enums.ReportType;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Report;
import com.jafar.management.repository.ReportRepository;
import com.jafar.management.repository.BranchRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class ReportWorkflowTest {
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-26T22:30:00Z"), ZoneId.of("Africa/Addis_Ababa"));

    @Test
    void managerCanCreateEditAndSubmitOwnDraftOnce() throws Exception {
        Report draft = new Report();
        ReportRepository reports = repository(draft);
        ReportController controller = new ReportController(reports, proxy(BranchRepository.class, (p, m, a) -> null), null, CLOCK);
        AppUser manager = user("manager", UserRole.BRANCH_MANAGER, 5L, 7L);
        var create = new ReportController.CreateReportRequest("Weekly report", "Attendance and progress notes",
                ReportType.MANAGER_TO_ADMIN, LocalDate.of(2026, 10, 19), LocalDate.of(2026, 10, 25));

        Report saved = controller.createReport(create, manager);
        assertEquals(ReportStatus.DRAFT, saved.getStatus());
        assertEquals(5L, saved.getBranchId());
        assertEquals(7L, saved.getAuthorId());
        assertEquals(LocalDateTime.now(CLOCK), saved.getCreatedAt());

        var edited = new ReportController.CreateReportRequest("Updated weekly report", "Updated notes",
                ReportType.MANAGER_TO_ADMIN, LocalDate.of(2026, 10, 20), LocalDate.of(2026, 10, 26));
        assertEquals("Updated weekly report", controller.updateReport(1L, edited, manager).getTitle());

        Report submitted = controller.submitReport(1L, manager);
        assertEquals(ReportStatus.SUBMITTED, submitted.getStatus());
        assertEquals(LocalDateTime.now(CLOCK), submitted.getSubmittedAt());
        assertThrows(ResponseStatusException.class, () -> controller.submitReport(1L, manager));
    }

    @Test
    void assignedManagerCanMarkSubmittedTeacherReportReviewed() throws Exception {
        Report report = new Report();
        report.setAuthorId(11L); report.setBranchId(5L); report.setReportType(ReportType.TEACHER_TO_MANAGER);
        report.setStatus(ReportStatus.SUBMITTED);
        ReportController controller = new ReportController(repository(report), proxy(BranchRepository.class, (p, m, a) -> null), null, CLOCK);

        Report reviewed = controller.reviewReport(1L,
                new ReportController.ReviewRequest("Reviewed"), user("manager", UserRole.BRANCH_MANAGER, 5L, 7L));

        assertEquals(ReportStatus.REVIEWED, reviewed.getStatus());
        assertEquals(7L, reviewed.getReviewedById());
        assertEquals("Reviewed", reviewed.getReviewRemarks());
        assertEquals(LocalDateTime.now(CLOCK), reviewed.getReviewedAt());
        assertThrows(ResponseStatusException.class, () -> controller.reviewReport(1L,
                new ReportController.ReviewRequest(null), user("other", UserRole.BRANCH_MANAGER, 6L, 8L)));
    }

    @Test
    void reportPeriodMustBeOrdered() throws Exception {
        ReportController controller = new ReportController(repository(new Report()), proxy(BranchRepository.class, (p, m, a) -> null), null, CLOCK);
        var invalid = new ReportController.CreateReportRequest("Invalid", "Content", ReportType.MANAGER_TO_ADMIN,
                LocalDate.of(2026, 10, 25), LocalDate.of(2026, 10, 19));
        assertThrows(ResponseStatusException.class,
                () -> controller.createReport(invalid, user("manager", UserRole.BRANCH_MANAGER, 5L, 7L)));
    }

    private ReportRepository repository(Report report) {
        AtomicReference<Report> stored = new AtomicReference<>(report);
        return proxy(ReportRepository.class, (proxy, method, args) -> switch (method.getName()) {
            case "save" -> { stored.set((Report) args[0]); yield args[0]; }
            case "findById" -> Optional.ofNullable(stored.get());
            default -> null;
        });
    }

    private AppUser user(String username, UserRole role, long branchId, long id) throws Exception {
        AppUser user = new AppUser(username, "hash", role, branchId);
        var field = AppUser.class.getDeclaredField("id"); field.setAccessible(true); field.set(user, id);
        return user;
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, java.lang.reflect.InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler);
    }
}
