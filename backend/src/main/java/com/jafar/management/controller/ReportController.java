package com.jafar.management.controller;

import com.jafar.management.dto.enums.ReportStatus;
import com.jafar.management.dto.enums.ReportType;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Report;
import com.jafar.management.repository.ReportRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportRepository reportRepository;

    public ReportController(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    public record ReviewRequest(String reviewRemarks) {}
    public record CreateReportRequest(String title, String content, ReportType reportType, java.time.LocalDate periodStart, java.time.LocalDate periodEnd) {}

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public List<Report> listReports(@AuthenticationPrincipal AppUser user, 
                                    @RequestParam(required = false) ReportStatus status,
                                    @RequestParam(required = false) ReportType type) {
        if (user.getRole() == UserRole.ADMINISTRATOR) {
            if (status != null) return reportRepository.findAllByStatus(status);
            if (type != null) return reportRepository.findAllByReportType(type);
            return reportRepository.findAll();
        } else if (user.getRole() == UserRole.BRANCH_MANAGER) {
            if (status != null) return reportRepository.findAllByBranchIdAndStatus(user.getBranchId(), status);
            if (type != null) return reportRepository.findAllByBranchIdAndReportType(user.getBranchId(), type);
            return reportRepository.findAllByBranchId(user.getBranchId());
        } else {
            if (status != null) return reportRepository.findAllByAuthorIdAndStatus(user.getId(), status);
            return reportRepository.findAllByAuthorId(user.getId());
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public Report getReport(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        Report report = reportRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (user.getRole() == UserRole.QURAN_TEACHER && !report.getAuthorId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (user.getRole() == UserRole.BRANCH_MANAGER && !report.getBranchId().equals(user.getBranchId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return report;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('BRANCH_MANAGER', 'QURAN_TEACHER')")
    public Report createReport(@RequestBody @Valid CreateReportRequest request, @AuthenticationPrincipal AppUser user) {
        if (user.getRole() == UserRole.QURAN_TEACHER && request.reportType() != ReportType.TEACHER_TO_MANAGER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Teacher can only create TEACHER_TO_MANAGER reports");
        }
        if (user.getRole() == UserRole.BRANCH_MANAGER && request.reportType() != ReportType.MANAGER_TO_ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Manager can only create MANAGER_TO_ADMIN reports");
        }

        Report report = new Report();
        report.setTitle(request.title());
        report.setContent(request.content());
        report.setReportType(request.reportType());
        report.setPeriodStart(request.periodStart());
        report.setPeriodEnd(request.periodEnd());
        report.setAuthorId(user.getId());
        report.setBranchId(user.getBranchId());
        report.setStatus(ReportStatus.DRAFT);
        
        return reportRepository.save(report);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('BRANCH_MANAGER', 'QURAN_TEACHER')")
    public Report updateReport(@PathVariable Long id, @RequestBody @Valid CreateReportRequest request, @AuthenticationPrincipal AppUser user) {
        Report report = reportRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!report.getAuthorId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (report.getStatus() != ReportStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT reports can be updated");
        }

        report.setTitle(request.title());
        report.setContent(request.content());
        report.setPeriodStart(request.periodStart());
        report.setPeriodEnd(request.periodEnd());
        return reportRepository.save(report);
    }

    @PutMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('BRANCH_MANAGER', 'QURAN_TEACHER')")
    public Report submitReport(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        Report report = reportRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!report.getAuthorId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (report.getStatus() != ReportStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT reports can be submitted");
        }

        report.setStatus(ReportStatus.SUBMITTED);
        report.setSubmittedAt(LocalDateTime.now());
        return reportRepository.save(report);
    }

    @PutMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public Report reviewReport(@PathVariable Long id, @RequestBody ReviewRequest request, @AuthenticationPrincipal AppUser user) {
        Report report = reportRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        
        if (user.getRole() == UserRole.BRANCH_MANAGER && report.getReportType() != ReportType.TEACHER_TO_MANAGER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Manager can only review TEACHER_TO_MANAGER reports");
        }
        if (user.getRole() == UserRole.BRANCH_MANAGER && !report.getBranchId().equals(user.getBranchId())) {
             throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (user.getRole() == UserRole.ADMINISTRATOR && report.getReportType() != ReportType.MANAGER_TO_ADMIN) {
             throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin can only review MANAGER_TO_ADMIN reports");
        }
        if (report.getStatus() != ReportStatus.SUBMITTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only SUBMITTED reports can be reviewed");
        }

        report.setStatus(ReportStatus.REVIEWED);
        report.setReviewedById(user.getId());
        report.setReviewRemarks(request.reviewRemarks());
        report.setReviewedAt(LocalDateTime.now());
        return reportRepository.save(report);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public void deleteReport(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        Report report = reportRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        
        if (user.getRole() != UserRole.ADMINISTRATOR && !report.getAuthorId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (report.getStatus() != ReportStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT reports can be deleted");
        }
        
        reportRepository.delete(report);
    }
}
