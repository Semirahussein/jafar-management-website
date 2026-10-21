package com.jafar.management.repository;

import com.jafar.management.model.StudentAttendance;
import com.jafar.management.dto.enums.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface StudentAttendanceRepository extends JpaRepository<StudentAttendance, Long> {
    List<StudentAttendance> findAllByBranchId(Long branchId);
    List<StudentAttendance> findAllByTeacherId(Long teacherId);
    List<StudentAttendance> findAllByStudentId(Long studentId);
    List<StudentAttendance> findAllByBranchIdAndDateBetween(Long branchId, LocalDate start, LocalDate end);
    List<StudentAttendance> findAllByTeacherIdAndDateBetween(Long teacherId, LocalDate start, LocalDate end);
    List<StudentAttendance> findAllByDateBetween(LocalDate start, LocalDate end);
    boolean existsByStudentIdAndDate(Long studentId, LocalDate date);
    long countByBranchIdAndDateAndStatus(Long branchId, LocalDate date, AttendanceStatus status);
    long countByDateAndStatus(LocalDate date, AttendanceStatus status);
    long countByBranchIdAndDate(Long branchId, LocalDate date);
    long countByDate(LocalDate date);
}
