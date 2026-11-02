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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

@Service
public class DashboardService {
    private final StudentRepository students;
    private final AppUserRepository users;
    private final BranchRepository branches;
    private final StudentAttendanceRepository studentAttendance;
    private final TeacherAttendanceRepository teacherAttendance;
    private final QuranProgressRepository progress;
    private final ReportRepository reports;
    private final Clock clock;

    public DashboardService(StudentRepository students, AppUserRepository users, BranchRepository branches,
            StudentAttendanceRepository studentAttendance, TeacherAttendanceRepository teacherAttendance,
            QuranProgressRepository progress, ReportRepository reports, Clock clock) {
        this.students = students;
        this.users = users;
        this.branches = branches;
        this.studentAttendance = studentAttendance;
        this.teacherAttendance = teacherAttendance;
        this.progress = progress;
        this.reports = reports;
        this.clock = clock;
    }

    public record AttendanceStats(long present, long absent, long late, long excused, long total) {}
    public record AdminDashboardDto(long totalBranches, long totalStudents, long totalTeachers,
            AttendanceStats todayStudentAttendance, AttendanceStats todayTeacherAttendance,
            List<Object> recentProgress, long pendingReports) {}
    public record ManagerDashboardDto(long totalStudents, long totalTeachers,
            AttendanceStats todayStudentAttendance, AttendanceStats todayTeacherAttendance,
            List<Object> recentProgress, long pendingReports) {}
    public record TeacherDashboardDto(long assignedStudents, AttendanceStats todayAttendance,
            List<Object> recentProgress, long pendingReports) {}

    public Object getDashboard(AppUser user) {
        LocalDate today = LocalDate.now(clock);
        return switch (user.getRole()) {
            case ADMINISTRATOR -> administratorDashboard(today);
            case BRANCH_MANAGER -> managerDashboard(today, requireBranch(user));
            case QURAN_TEACHER -> teacherDashboard(today, user.getId());
        };
    }

    private AdminDashboardDto administratorDashboard(LocalDate today) {
        return new AdminDashboardDto(
                branches.count(),
                students.count(),
                users.countByRoleAndActiveTrue(UserRole.QURAN_TEACHER),
                studentAttendance(today, null, null),
                teacherAttendance(today, null),
                objects(progress.findTop10ByOrderByCreatedAtDesc()),
                reports.countByStatus(ReportStatus.SUBMITTED));
    }

    private ManagerDashboardDto managerDashboard(LocalDate today, Long branchId) {
        return new ManagerDashboardDto(
                students.countByBranchId(branchId),
                users.countByRoleAndBranchIdAndActiveTrue(UserRole.QURAN_TEACHER, branchId),
                studentAttendance(today, branchId, null),
                teacherAttendance(today, branchId),
                objects(progress.findTop10ByBranchIdOrderByCreatedAtDesc(branchId)),
                reports.countByBranchIdAndStatus(branchId, ReportStatus.SUBMITTED));
    }

    private TeacherDashboardDto teacherDashboard(LocalDate today, Long teacherId) {
        return new TeacherDashboardDto(
                students.countByTeacherId(teacherId),
                studentAttendance(today, null, teacherId),
                objects(progress.findTop10ByTeacherIdOrderByCreatedAtDesc(teacherId)),
                reports.countByAuthorIdAndStatus(teacherId, ReportStatus.DRAFT));
    }

    private AttendanceStats studentAttendance(LocalDate date, Long branchId, Long teacherId) {
        long present = studentAttendanceCount(date, branchId, teacherId, AttendanceStatus.PRESENT);
        long absent = studentAttendanceCount(date, branchId, teacherId, AttendanceStatus.ABSENT);
        long late = studentAttendanceCount(date, branchId, teacherId, AttendanceStatus.LATE);
        long excused = studentAttendanceCount(date, branchId, teacherId, AttendanceStatus.EXCUSED);
        long total = teacherId != null
                ? studentAttendance.countByTeacherIdAndDate(teacherId, date)
                : branchId != null ? studentAttendance.countByBranchIdAndDate(branchId, date)
                : studentAttendance.countByDate(date);
        return new AttendanceStats(present, absent, late, excused, total);
    }

    private long studentAttendanceCount(LocalDate date, Long branchId, Long teacherId, AttendanceStatus status) {
        return teacherId != null
                ? studentAttendance.countByTeacherIdAndDateAndStatus(teacherId, date, status)
                : branchId != null ? studentAttendance.countByBranchIdAndDateAndStatus(branchId, date, status)
                : studentAttendance.countByDateAndStatus(date, status);
    }

    private AttendanceStats teacherAttendance(LocalDate date, Long branchId) {
        long present = branchId != null
                ? teacherAttendance.countByBranchIdAndDateAndStatus(branchId, date, AttendanceStatus.PRESENT)
                : teacherAttendance.countByDateAndStatus(date, AttendanceStatus.PRESENT);
        long absent = branchId != null
                ? teacherAttendance.countByBranchIdAndDateAndStatus(branchId, date, AttendanceStatus.ABSENT)
                : teacherAttendance.countByDateAndStatus(date, AttendanceStatus.ABSENT);
        long late = branchId != null
                ? teacherAttendance.countByBranchIdAndDateAndStatus(branchId, date, AttendanceStatus.LATE)
                : teacherAttendance.countByDateAndStatus(date, AttendanceStatus.LATE);
        long excused = branchId != null
                ? teacherAttendance.countByBranchIdAndDateAndStatus(branchId, date, AttendanceStatus.EXCUSED)
                : teacherAttendance.countByDateAndStatus(date, AttendanceStatus.EXCUSED);
        long total = branchId != null
                ? teacherAttendance.countByBranchIdAndDate(branchId, date)
                : teacherAttendance.countByDate(date);
        return new AttendanceStats(present, absent, late, excused, total);
    }

    private Long requireBranch(AppUser user) {
        if (user.getBranchId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account is not assigned to a branch");
        }
        return user.getBranchId();
    }

    @SuppressWarnings("unchecked")
    private List<Object> objects(List<?> values) {
        return (List<Object>) (List<?>) values;
    }
}
