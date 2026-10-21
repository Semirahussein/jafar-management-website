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
    public List<QuranProgress> getProgressRecords(
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @RequestParam(required = false) String surahName,
            @RequestParam(required = false) ActivityType activityType,
            @AuthenticationPrincipal AppUser user) {
        
        List<QuranProgress> records;
        if (user.getRole() == UserRole.ADMINISTRATOR) {
            records = quranProgressRepository.findAll();
        } else if (user.getRole() == UserRole.BRANCH_MANAGER) {
            records = quranProgressRepository.findAllByBranchId(user.getBranchId());
        } else {
            records = quranProgressRepository.findAllByTeacherId(user.getId());
        }

        return records.stream()
                .filter(r -> studentId == null || r.getStudentId().equals(studentId))
                .filter(r -> startDate == null || !r.getDate().isBefore(startDate))
                .filter(r -> endDate == null || !r.getDate().isAfter(endDate))
                .filter(r -> surahName == null || r.getSurahName().equalsIgnoreCase(surahName))
                .filter(r -> activityType == null || r.getActivityType() == activityType)
                .toList();
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
