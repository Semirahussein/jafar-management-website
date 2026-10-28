package com.jafar.management.repository;

import com.jafar.management.model.QuranProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.jafar.management.dto.enums.ActivityType;

@Repository
public interface QuranProgressRepository extends JpaRepository<QuranProgress, Long> {
    @Query("select p from QuranProgress p where (:scopeBranchId is null or p.branchId = :scopeBranchId) and (:scopeTeacherId is null or p.teacherId = :scopeTeacherId) and (:studentId is null or p.studentId = :studentId) and (:teacherId is null or p.teacherId = :teacherId) and (:branchId is null or p.branchId = :branchId) and (:startDate is null or p.date >= :startDate) and (:endDate is null or p.date <= :endDate) and (:surah is null or lower(p.surahName) like lower(concat('%', :surah, '%'))) and (:activityType is null or p.activityType = :activityType) and (:studentSearch is null or exists (select s.id from Student s where s.id = p.studentId and (lower(s.fullName) like lower(concat('%', :studentSearch, '%')) or lower(s.studentNumber) like lower(concat('%', :studentSearch, '%'))))) and (:teacherSearch is null or exists (select u.id from AppUser u where u.id = p.teacherId and (lower(u.username) like lower(concat('%', :teacherSearch, '%')) or lower(coalesce(u.fullName, '')) like lower(concat('%', :teacherSearch, '%')))))")
    Page<QuranProgress> searchProgress(@Param("scopeBranchId") Long scopeBranchId, @Param("scopeTeacherId") Long scopeTeacherId,
            @Param("studentId") Long studentId, @Param("teacherId") Long teacherId, @Param("branchId") Long branchId,
            @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate,
            @Param("surah") String surah, @Param("activityType") ActivityType activityType,
            @Param("studentSearch") String studentSearch, @Param("teacherSearch") String teacherSearch, Pageable pageable);
    boolean existsByBranchId(Long branchId);
    boolean existsByStudentId(Long studentId);
    List<QuranProgress> findAllByBranchId(Long branchId);
    List<QuranProgress> findAllByTeacherId(Long teacherId);
    List<QuranProgress> findAllByStudentId(Long studentId);
    List<QuranProgress> findAllByStudentIdOrderByDateDesc(Long studentId);
    List<QuranProgress> findAllByBranchIdAndDateBetween(Long branchId, LocalDate start, LocalDate end);
    List<QuranProgress> findAllByTeacherIdAndDateBetween(Long teacherId, LocalDate start, LocalDate end);
    List<QuranProgress> findAllByDateBetween(LocalDate start, LocalDate end);
    List<QuranProgress> findTop10ByBranchIdOrderByCreatedAtDesc(Long branchId);
    List<QuranProgress> findTop10ByOrderByCreatedAtDesc();
    List<QuranProgress> findTop10ByTeacherIdOrderByCreatedAtDesc(Long teacherId);
    long countByBranchId(Long branchId);
    long countByTeacherId(Long teacherId);
}
