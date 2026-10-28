package com.jafar.management.repository;

import com.jafar.management.model.StudentAttendance;
import com.jafar.management.dto.enums.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentAttendanceRepository extends JpaRepository<StudentAttendance, Long> {
    boolean existsByBranchId(Long branchId);
    boolean existsByStudentId(Long studentId);
    List<StudentAttendance> findAllByBranchId(Long branchId);
    List<StudentAttendance> findAllByTeacherId(Long teacherId);
    List<StudentAttendance> findAllByStudentId(Long studentId);
    List<StudentAttendance> findAllByBranchIdAndDateBetween(Long branchId, LocalDate start, LocalDate end);
    List<StudentAttendance> findAllByTeacherIdAndDateBetween(Long teacherId, LocalDate start, LocalDate end);
    List<StudentAttendance> findAllByDateBetween(LocalDate start, LocalDate end);
    boolean existsByStudentIdAndDate(Long studentId, LocalDate date);
    @Query("select a from StudentAttendance a where a.date between :start and :end and (:branchId is null or a.branchId = :branchId) and (:teacherId is null or a.teacherId = :teacherId) and (:studentId is null or a.studentId = :studentId) and (:status is null or a.status = :status) and (:q is null or exists (select s.id from Student s where s.id = a.studentId and (lower(s.fullName) like lower(concat('%', :q, '%')) or lower(s.studentNumber) like lower(concat('%', :q, '%')))))")
    Page<StudentAttendance> searchAttendance(@Param("start") LocalDate start, @Param("end") LocalDate end,
            @Param("branchId") Long branchId, @Param("teacherId") Long teacherId,
            @Param("studentId") Long studentId, @Param("status") AttendanceStatus status,
            @Param("q") String q, Pageable pageable);
    long countByBranchIdAndDateAndStatus(Long branchId, LocalDate date, AttendanceStatus status);
    long countByDateAndStatus(LocalDate date, AttendanceStatus status);
    long countByBranchIdAndDate(Long branchId, LocalDate date);
    long countByDate(LocalDate date);
    long countByTeacherIdAndDateAndStatus(Long teacherId, LocalDate date, AttendanceStatus status);
    long countByTeacherIdAndDate(Long teacherId, LocalDate date);
}
