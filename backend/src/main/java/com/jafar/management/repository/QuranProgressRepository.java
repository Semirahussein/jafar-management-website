package com.jafar.management.repository;

import com.jafar.management.model.QuranProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface QuranProgressRepository extends JpaRepository<QuranProgress, Long> {
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
