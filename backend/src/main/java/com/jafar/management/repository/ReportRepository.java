package com.jafar.management.repository;

import com.jafar.management.dto.enums.ReportStatus;
import com.jafar.management.dto.enums.ReportType;
import com.jafar.management.model.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    @Query("select r from Report r where (:branchId is null or r.branchId = :branchId) and (:authorId is null or r.authorId = :authorId) and (:status is null or r.status = :status) and (:type is null or r.reportType = :type) and (:periodStart is null or r.periodEnd >= :periodStart) and (:periodEnd is null or r.periodStart <= :periodEnd)")
    Page<Report> searchReports(@Param("branchId") Long branchId, @Param("authorId") Long authorId,
            @Param("status") ReportStatus status, @Param("type") ReportType type,
            @Param("periodStart") LocalDate periodStart, @Param("periodEnd") LocalDate periodEnd, Pageable pageable);
    boolean existsByBranchId(Long branchId);
    List<Report> findAllByAuthorId(Long authorId);
    List<Report> findAllByBranchId(Long branchId);
    List<Report> findAllByBranchIdAndReportType(Long branchId, ReportType type);
    List<Report> findAllByReportType(ReportType type);
    List<Report> findAllByAuthorIdAndStatus(Long authorId, ReportStatus status);
    List<Report> findAllByBranchIdAndStatus(Long branchId, ReportStatus status);
    List<Report> findAllByStatus(ReportStatus status);
    long countByBranchIdAndStatus(Long branchId, ReportStatus status);
    long countByAuthorIdAndStatus(Long authorId, ReportStatus status);
    long countByStatus(ReportStatus status);

    default List<Report> findAllMatching(Long branchId, Long authorId, ReportStatus status, ReportType type,
            LocalDate periodStart, LocalDate periodEnd, int limit) {
        return searchReports(branchId, authorId, status, type, periodStart, periodEnd,
                PageRequest.of(0, limit, Sort.by("createdAt").descending().and(Sort.by("id").descending()))).getContent();
    }

    @Query("select r.status, count(r) from Report r where (:branchId is null or r.branchId = :branchId) and (:authorId is null or r.authorId = :authorId) and (:status is null or r.status = :status) and (:type is null or r.reportType = :type) and (:periodStart is null or r.periodEnd >= :periodStart) and (:periodEnd is null or r.periodStart <= :periodEnd) group by r.status")
    List<Object[]> aggregateStatus(@Param("branchId") Long branchId, @Param("authorId") Long authorId,
            @Param("status") ReportStatus status, @Param("type") ReportType type,
            @Param("periodStart") LocalDate periodStart, @Param("periodEnd") LocalDate periodEnd);

    @Query("select r.reportType, count(r) from Report r where (:branchId is null or r.branchId = :branchId) and (:authorId is null or r.authorId = :authorId) and (:status is null or r.status = :status) and (:type is null or r.reportType = :type) and (:periodStart is null or r.periodEnd >= :periodStart) and (:periodEnd is null or r.periodStart <= :periodEnd) group by r.reportType")
    List<Object[]> aggregateType(@Param("branchId") Long branchId, @Param("authorId") Long authorId,
            @Param("status") ReportStatus status, @Param("type") ReportType type,
            @Param("periodStart") LocalDate periodStart, @Param("periodEnd") LocalDate periodEnd);

    @Query("select r.branchId, count(r) from Report r where (:branchId is null or r.branchId = :branchId) and (:authorId is null or r.authorId = :authorId) and (:status is null or r.status = :status) and (:type is null or r.reportType = :type) and (:periodStart is null or r.periodEnd >= :periodStart) and (:periodEnd is null or r.periodStart <= :periodEnd) group by r.branchId")
    List<Object[]> aggregateBranch(@Param("branchId") Long branchId, @Param("authorId") Long authorId,
            @Param("status") ReportStatus status, @Param("type") ReportType type,
            @Param("periodStart") LocalDate periodStart, @Param("periodEnd") LocalDate periodEnd);
}
