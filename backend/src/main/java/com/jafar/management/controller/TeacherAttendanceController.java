package com.jafar.management.controller;

import com.jafar.management.dto.enums.AttendanceStatus;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.TeacherAttendance;
import com.jafar.management.repository.AppUserRepository;
import com.jafar.management.repository.TeacherAttendanceRepository;
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

@RestController
@RequestMapping("/api/teacher-attendance")
public class TeacherAttendanceController {

    private final TeacherAttendanceRepository attendanceRepository;
    private final AppUserRepository userRepository;

    public TeacherAttendanceController(TeacherAttendanceRepository attendanceRepository, AppUserRepository userRepository) {
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
    }

    public record CreateTeacherAttendanceRequest(
            @NotNull Long teacherId,
            @NotNull LocalDate date,
            @NotNull AttendanceStatus status,
            @Size(max = 500) String remarks
    ) {}

    public record UpdateTeacherAttendanceRequest(
            @NotNull AttendanceStatus status,
            @Size(max = 500) String remarks
    ) {}

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public List<TeacherAttendance> list(
            @RequestParam(required = false) LocalDate date,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @AuthenticationPrincipal AppUser user) {
        
        LocalDate start = startDate != null ? startDate : (date != null ? date : LocalDate.now().minusYears(100));
        LocalDate end = endDate != null ? endDate : (date != null ? date : LocalDate.now().plusYears(100));

        if (user.getRole() == UserRole.ADMINISTRATOR) {
            return attendanceRepository.findAllByDateBetween(start, end);
        } else {
            return attendanceRepository.findAllByBranchIdAndDateBetween(user.getBranchId(), start, end);
        }
    }

    @GetMapping("/teacher/{teacherId}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public List<TeacherAttendance> getByTeacherId(@PathVariable Long teacherId, @AuthenticationPrincipal AppUser user) {
        AppUser teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Teacher not found"));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !user.getBranchId().equals(teacher.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Teacher not in your branch");
        }

        return attendanceRepository.findAllByTeacherId(teacherId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public TeacherAttendance getById(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        TeacherAttendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance not found"));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !user.getBranchId().equals(attendance.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Attendance not in your branch");
        }

        return attendance;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public TeacherAttendance recordAttendance(@Valid @RequestBody CreateTeacherAttendanceRequest request, @AuthenticationPrincipal AppUser user) {
        AppUser teacher = userRepository.findById(request.teacherId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Teacher not found"));

        if (teacher.getRole() != UserRole.QURAN_TEACHER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User is not a teacher");
        }

        if (user.getRole() == UserRole.BRANCH_MANAGER && !user.getBranchId().equals(teacher.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot record attendance for teacher outside your branch");
        }

        if (attendanceRepository.existsByTeacherIdAndDate(teacher.getId(), request.date())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Attendance for this date already recorded");
        }

        TeacherAttendance attendance = new TeacherAttendance();
        attendance.setTeacherId(teacher.getId());
        attendance.setDate(request.date());
        attendance.setStatus(request.status());
        attendance.setRecordedById(user.getId());
        attendance.setBranchId(teacher.getBranchId());
        attendance.setRemarks(request.remarks());

        return attendanceRepository.save(attendance);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public TeacherAttendance updateAttendance(@PathVariable Long id, @Valid @RequestBody UpdateTeacherAttendanceRequest request, @AuthenticationPrincipal AppUser user) {
        TeacherAttendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance not found"));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !user.getBranchId().equals(attendance.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot update attendance outside your branch");
        }

        attendance.setStatus(request.status());
        attendance.setRemarks(request.remarks());

        return attendanceRepository.save(attendance);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public void deleteAttendance(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        TeacherAttendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance not found"));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !user.getBranchId().equals(attendance.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete attendance outside your branch");
        }

        attendanceRepository.delete(attendance);
    }
}
