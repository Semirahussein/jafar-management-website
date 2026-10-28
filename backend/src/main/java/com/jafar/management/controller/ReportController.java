package com.jafar.management.controller;

import com.jafar.management.dto.enums.ReportStatus;
import com.jafar.management.dto.enums.ReportType;
import com.jafar.management.dto.enums.UserRole;
import com.jafar.management.model.AppUser;
import com.jafar.management.model.Report;
import com.jafar.management.repository.ReportRepository;
import com.jafar.management.repository.BranchRepository;
import com.jafar.management.service.ReportExportService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.time.Clock;
import java.time.LocalDate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportRepository reportRepository;
    private final BranchRepository branchRepository;
    private final ReportExportService exportService;
    private final Clock clock;

    public ReportController(ReportRepository reportRepository, BranchRepository branchRepository,
            ReportExportService exportService, Clock clock) {
        this.reportRepository = reportRepository;
        this.branchRepository = branchRepository;
        this.exportService = exportService;
        this.clock = clock;
    }

    public record ReviewRequest(@Size(max = 1000) String reviewRemarks) {}
    public record CreateReportRequest(@NotBlank @Size(max = 200) String title,
            @NotBlank String content, @NotNull ReportType reportType,
            @NotNull LocalDate periodStart, @NotNull LocalDate periodEnd) {}

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public Page<Report> listReports(@AuthenticationPrincipal AppUser user,
                                    @RequestParam(required = false) ReportStatus status,
                                    @RequestParam(required = false) ReportType type,
                                    @RequestParam(required = false) Long branchId,
                                    @RequestParam(required = false) java.time.LocalDate periodStart,
                                    @RequestParam(required = false) java.time.LocalDate periodEnd,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        if (page < 0 || size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must be non-negative and size must be between 1 and 100");
        if (periodStart != null && periodEnd != null && periodStart.isAfter(periodEnd)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Period start cannot be after period end");
        Scope scope = scope(user, branchId);
        Long scopedBranch = scope.branchId();
        Long scopedAuthor = scope.authorId();
        return reportRepository.searchReports(scopedBranch, scopedAuthor, status, type, periodStart, periodEnd,
                PageRequest.of(page, size, Sort.by("createdAt").descending().and(Sort.by("id").descending())));
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public Map<String, Object> reportAnalytics(@AuthenticationPrincipal AppUser user,
            @RequestParam(required = false) ReportStatus status, @RequestParam(required = false) ReportType type,
            @RequestParam(required = false) Long branchId, @RequestParam(required = false) LocalDate periodStart,
            @RequestParam(required = false) LocalDate periodEnd) {
        validateFilters(periodStart, periodEnd);
        Scope scope = scope(user, branchId);
        Map<String, Long> byStatus = aggregate(reportRepository.aggregateStatus(scope.branchId(), scope.authorId(), status, type, periodStart, periodEnd));
        Map<String, Long> byType = aggregate(reportRepository.aggregateType(scope.branchId(), scope.authorId(), status, type, periodStart, periodEnd));
        Map<String, Long> byBranch = new LinkedHashMap<>();
        List<Object[]> branchCounts = reportRepository.aggregateBranch(scope.branchId(), scope.authorId(), status, type, periodStart, periodEnd);
        Map<Long, String> branchNames = new LinkedHashMap<>();
        branchRepository.findAllById(branchCounts.stream().map(row -> (Long) row[0]).toList())
                .forEach(branch -> branchNames.put(branch.getId(), branch.getName()));
        for (Object[] row : branchCounts) {
            Long id = (Long) row[0];
            String name = branchNames.getOrDefault(id, "Branch " + id);
            byBranch.put(name, ((Number) row[1]).longValue());
        }
        long total = byStatus.values().stream().mapToLong(Long::longValue).sum();
        return Map.of("totalReports", total, "byStatus", byStatus, "byType", byType, "byBranch", byBranch,
                "periodStart", periodStart == null ? "" : periodStart.toString(),
                "periodEnd", periodEnd == null ? "" : periodEnd.toString());
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER', 'QURAN_TEACHER')")
    public ResponseEntity<byte[]> exportReports(@AuthenticationPrincipal AppUser user,
            @RequestParam String format, @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) ReportType type, @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) LocalDate periodStart, @RequestParam(required = false) LocalDate periodEnd) {
        validateFilters(periodStart, periodEnd);
        if (!format.equalsIgnoreCase("pdf") && !format.equalsIgnoreCase("xlsx"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format must be pdf or xlsx");
        Scope scope = scope(user, branchId);
        try {
            byte[] content = exportService.export(format, scope.branchId(), scope.authorId(), status, type, periodStart, periodEnd);
            String extension = format.toLowerCase();
            MediaType mediaType = extension.equals("pdf") ? MediaType.APPLICATION_PDF
                    : MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            return ResponseEntity.ok().contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=reports-" + LocalDate.now(clock) + "." + extension)
                    .body(content);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    private record Scope(Long branchId, Long authorId) {}
    private Scope scope(AppUser user, Long requestedBranch) {
        Long branch = user.getRole() == UserRole.BRANCH_MANAGER ? user.getBranchId() : requestedBranch;
        Long author = user.getRole() == UserRole.QURAN_TEACHER ? user.getId() : null;
        if (user.getRole() == UserRole.BRANCH_MANAGER && branch == null)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account is not assigned to a branch");
        return new Scope(branch, author);
    }
    private void validateFilters(LocalDate periodStart, LocalDate periodEnd) {
        if (periodStart != null && periodEnd != null && periodStart.isAfter(periodEnd))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Period start cannot be after period end");
    }
    private Map<String, Long> aggregate(List<Object[]> rows) {
        Map<String, Long> result = new LinkedHashMap<>();
        for (Object[] row : rows) result.put(row[0].toString(), ((Number) row[1]).longValue());
        return result;
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
        validatePeriod(request.periodStart(), request.periodEnd());
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
        report.setCreatedAt(LocalDateTime.now(clock));
        report.setAuthorId(user.getId());
        report.setBranchId(user.getBranchId());
        report.setStatus(ReportStatus.DRAFT);
        
        return reportRepository.save(report);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('BRANCH_MANAGER', 'QURAN_TEACHER')")
    public Report updateReport(@PathVariable Long id, @RequestBody @Valid CreateReportRequest request, @AuthenticationPrincipal AppUser user) {
        validatePeriod(request.periodStart(), request.periodEnd());
        Report report = reportRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!report.getAuthorId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (report.getStatus() != ReportStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT reports can be updated");
        }
        if (request.reportType() != report.getReportType()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A draft's report type cannot be changed");
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
        report.setSubmittedAt(LocalDateTime.now(clock));
        return reportRepository.save(report);
    }

    @PutMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'BRANCH_MANAGER')")
    public Report reviewReport(@PathVariable Long id, @RequestBody @Valid ReviewRequest request, @AuthenticationPrincipal AppUser user) {
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
        report.setReviewedAt(LocalDateTime.now(clock));
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

    private void validatePeriod(LocalDate start, LocalDate end) {
        if (start == null || end == null || start.isAfter(end)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid reporting period is required");
        }
    }
}
