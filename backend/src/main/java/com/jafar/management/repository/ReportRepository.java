package com.jafar.management.repository;

import com.jafar.management.dto.enums.ReportStatus;
import com.jafar.management.dto.enums.ReportType;
import com.jafar.management.model.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findAllByAuthorId(Long authorId);
    List<Report> findAllByBranchId(Long branchId);
    List<Report> findAllByBranchIdAndReportType(Long branchId, ReportType type);
    List<Report> findAllByReportType(ReportType type);
    List<Report> findAllByAuthorIdAndStatus(Long authorId, ReportStatus status);
    List<Report> findAllByBranchIdAndStatus(Long branchId, ReportStatus status);
    List<Report> findAllByStatus(ReportStatus status);
    long countByBranchIdAndStatus(Long branchId, ReportStatus status);
    long countByStatus(ReportStatus status);
}
