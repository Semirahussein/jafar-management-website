package com.jafar.management.controller;

import com.jafar.management.model.QuranProgress;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Student;
import com.jafar.management.dto.enums.ActivityType;
import com.jafar.management.dto.enums.ProgressStatus;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.repository.QuranProgressRepository;
import com.jafar.management.repository.StudentRepository;
import com.jafar.management.repository.AppUserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/api/quran-progress")
public class QuranProgressController {

    private final QuranProgressRepository quranProgressRepository;
    private final StudentRepository studentRepository;
    private final AppUserRepository appUserRepository;

    public QuranProgressController(QuranProgressRepository quranProgressRepository, StudentRepository studentRepository, AppUserRepository appUserRepository) {
        this.quranProgressRepository = quranProgressRepository;
        this.studentRepository = studentRepository;
        this.appUserRepository = appUserRepository;
    }

    public record QuranProgressRequest(
            @NotNull Long studentId,
            @NotNull LocalDate date,
            @NotBlank String surahName,
            @NotNull @Positive Integer startAyah,
            @NotNull @Positive Integer endAyah,
            @NotNull ActivityType activityType,
            @NotNull ProgressStatus progressStatus,
            String remarks
    ) {}

    @GetMapping("")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public Page<QuranProgress> getProgressRecords(
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) Long teacherId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @RequestParam(required = false) String surahName,
            @RequestParam(required = false) String studentName,
            @RequestParam(required = false) String teacherName,
            @RequestParam(required = false) ActivityType activityType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal AppUser user) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date cannot be after end date");
        if (page < 0 || size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must be non-negative and size must be between 1 and 100");
        if (user.getRole() == UserRole.BRANCH_MANAGER && user.getBranchId() == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account is not assigned to a branch");
        Long scopeBranch = user.getRole() == UserRole.BRANCH_MANAGER ? user.getBranchId() : null;
        Long scopeTeacher = user.getRole() == UserRole.QURAN_TEACHER ? user.getId() : null;
        String surah = surahName == null || surahName.isBlank() ? null : surahName.trim();
        return quranProgressRepository.searchProgress(scopeBranch, scopeTeacher, studentId, teacherId, branchId,
                startDate, endDate, surah, activityType,
                studentName == null || studentName.isBlank() ? null : studentName.trim(),
                teacherName == null || teacherName.isBlank() ? null : teacherName.trim(),
                PageRequest.of(page, size, Sort.by("date").descending().and(Sort.by("id").descending())));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public List<QuranProgress> getStudentProgress(@PathVariable Long studentId, @AuthenticationPrincipal AppUser user) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !student.getBranchId().equals(user.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student does not belong to your branch");
        }
        if (user.getRole() == UserRole.QURAN_TEACHER && !user.getId().equals(student.getTeacherId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student is not assigned to you");
        }

        return quranProgressRepository.findAllByStudentIdOrderByDateDesc(studentId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public QuranProgress getRecord(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        QuranProgress record = quranProgressRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !record.getBranchId().equals(user.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Record does not belong to your branch");
        }
        if (user.getRole() == UserRole.QURAN_TEACHER && !record.getTeacherId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Record does not belong to your students");
        }

        return record;
    }

    @PostMapping("")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public QuranProgress createRecord(@Valid @RequestBody QuranProgressRequest request, @AuthenticationPrincipal AppUser user) {
        if (request.endAyah() < request.startAyah()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End ayah cannot be less than start ayah");
        }

        Student student = studentRepository.findById(request.studentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !student.getBranchId().equals(user.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student does not belong to your branch");
        }
        if (user.getRole() == UserRole.QURAN_TEACHER && !user.getId().equals(student.getTeacherId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student is not assigned to you");
        }

        QuranProgress progress = new QuranProgress();
        progress.setStudentId(student.getId());
        progress.setBranchId(student.getBranchId());
        progress.setTeacherId(user.getRole() == UserRole.QURAN_TEACHER ? user.getId() : student.getTeacherId());
        progress.setDate(request.date());
        progress.setSurahName(request.surahName());
        progress.setStartAyah(request.startAyah());
        progress.setEndAyah(request.endAyah());
        progress.setActivityType(request.activityType());
        progress.setProgressStatus(request.progressStatus());
        progress.setRemarks(request.remarks());

        return quranProgressRepository.save(progress);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public QuranProgress updateRecord(@PathVariable Long id, @Valid @RequestBody QuranProgressRequest request, @AuthenticationPrincipal AppUser user) {
        QuranProgress progress = quranProgressRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !progress.getBranchId().equals(user.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Record does not belong to your branch");
        }
        if (user.getRole() == UserRole.QURAN_TEACHER && !progress.getTeacherId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Record was not created by you");
        }

        if (request.endAyah() < request.startAyah()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End ayah cannot be less than start ayah");
        }

        progress.setDate(request.date());
        progress.setSurahName(request.surahName());
        progress.setStartAyah(request.startAyah());
        progress.setEndAyah(request.endAyah());
        progress.setActivityType(request.activityType());
        progress.setProgressStatus(request.progressStatus());
        progress.setRemarks(request.remarks());

        return quranProgressRepository.save(progress);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRecord(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        QuranProgress progress = quranProgressRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));

        if (user.getRole() == UserRole.BRANCH_MANAGER && !progress.getBranchId().equals(user.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Record does not belong to your branch");
        }

        quranProgressRepository.delete(progress);
    }
}
