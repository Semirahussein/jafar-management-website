package com.jafar.management.controller;

import com.jafar.management.dto.enums.AttendanceStatus;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Student;
import com.jafar.management.model.StudentAttendance;
import com.jafar.management.repository.StudentAttendanceRepository;
import com.jafar.management.repository.StudentRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/api/student-attendance")
public class StudentAttendanceController {

    private final StudentAttendanceRepository attendanceRepository;
    private final StudentRepository studentRepository;

    public StudentAttendanceController(StudentAttendanceRepository attendanceRepository, StudentRepository studentRepository) {
        this.attendanceRepository = attendanceRepository;
        this.studentRepository = studentRepository;
    }

    public record CreateStudentAttendanceRequest(
            @NotNull Long studentId,
            @NotNull LocalDate date,
            @NotNull AttendanceStatus status,
            @Size(max = 500) String remarks
    ) {}

    public record UpdateStudentAttendanceRequest(
            @NotNull AttendanceStatus status,
            @Size(max = 500) String remarks
    ) {}

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public Page<StudentAttendance> list(
            @RequestParam(required = false) LocalDate date,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) AttendanceStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal AppUser user) {
        
        LocalDate start = startDate != null ? startDate : (date != null ? date : LocalDate.now().minusYears(100));
        LocalDate end = endDate != null ? endDate : (date != null ? date : LocalDate.now().plusYears(100));

        validateSearch(start, end, page, size);
        Long scopedBranch = user.getRole() == UserRole.BRANCH_MANAGER ? user.getBranchId() : branchId;
        Long scopedTeacher = user.getRole() == UserRole.QURAN_TEACHER ? user.getId() : null;
        if (user.getRole() == UserRole.BRANCH_MANAGER && scopedBranch == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account is not assigned to a branch");
        return attendanceRepository.searchAttendance(start, end, scopedBranch, scopedTeacher, studentId, status,
                q == null || q.isBlank() ? null : q.trim(),
                PageRequest.of(page, size, Sort.by("date").descending().and(Sort.by("id").descending())));
    }

    private void validateSearch(LocalDate start, LocalDate end, int page, int size) {
        if (start.isAfter(end)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date cannot be after end date");
        if (page < 0 || size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must be non-negative and size must be between 1 and 100");
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public List<StudentAttendance> getByStudentId(@PathVariable Long studentId, @AuthenticationPrincipal AppUser user) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !java.util.Objects.equals(user.getBranchId(), student.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student not in your branch");
        }
        if (user.getRole() == UserRole.QURAN_TEACHER && !user.getId().equals(student.getTeacherId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student not assigned to you");
        }

        return attendanceRepository.findAllByStudentId(studentId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public StudentAttendance getById(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        StudentAttendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance not found"));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !java.util.Objects.equals(user.getBranchId(), attendance.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Attendance not in your branch");
        }
        if (user.getRole() == UserRole.QURAN_TEACHER && !java.util.Objects.equals(user.getId(), attendance.getTeacherId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Attendance not assigned to you");
        }

        return attendance;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public StudentAttendance recordAttendance(@Valid @RequestBody CreateStudentAttendanceRequest request, @AuthenticationPrincipal AppUser user) {
        Student student = studentRepository.findById(request.studentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !java.util.Objects.equals(user.getBranchId(), student.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot record attendance for student outside your branch");
        }
        if (user.getRole() == UserRole.QURAN_TEACHER && !java.util.Objects.equals(user.getId(), student.getTeacherId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot record attendance for student not assigned to you");
        }

        if (attendanceRepository.existsByStudentIdAndDate(student.getId(), request.date())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Attendance for this date already recorded");
        }

        StudentAttendance attendance = new StudentAttendance();
        attendance.setStudentId(student.getId());
        attendance.setDate(request.date());
        attendance.setStatus(request.status());
        attendance.setRecordedById(user.getId());
        attendance.setBranchId(student.getBranchId());
        attendance.setTeacherId(student.getTeacherId());
        attendance.setRemarks(request.remarks());

        try { return attendanceRepository.saveAndFlush(attendance); }
        catch (DataIntegrityViolationException duplicate) { throw new ResponseStatusException(HttpStatus.CONFLICT, "Attendance for this date already recorded", duplicate); }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public StudentAttendance updateAttendance(@PathVariable Long id, @Valid @RequestBody UpdateStudentAttendanceRequest request, @AuthenticationPrincipal AppUser user) {
        StudentAttendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance not found"));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !java.util.Objects.equals(user.getBranchId(), attendance.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot update attendance outside your branch");
        }
        if (user.getRole() == UserRole.QURAN_TEACHER && (!user.getId().equals(attendance.getRecordedById()) && !user.getId().equals(attendance.getTeacherId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot update this attendance record");
        }

        attendance.setStatus(request.status());
        attendance.setRemarks(request.remarks());

        return attendanceRepository.save(attendance);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public void deleteAttendance(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        StudentAttendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance not found"));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !user.getBranchId().equals(attendance.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete attendance outside your branch");
        }

        attendanceRepository.delete(attendance);
    }
}
