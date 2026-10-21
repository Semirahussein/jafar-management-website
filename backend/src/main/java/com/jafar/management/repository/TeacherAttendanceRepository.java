package com.jafar.management.repository;

import com.jafar.management.model.TeacherAttendance;
import com.jafar.management.dto.enums.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface TeacherAttendanceRepository extends JpaRepository<TeacherAttendance, Long> {
    List<TeacherAttendance> findAllByBranchId(Long branchId);
    List<TeacherAttendance> findAllByTeacherId(Long teacherId);
    List<TeacherAttendance> findAllByBranchIdAndDateBetween(Long branchId, LocalDate start, LocalDate end);
    List<TeacherAttendance> findAllByDateBetween(LocalDate start, LocalDate end);
    boolean existsByTeacherIdAndDate(Long teacherId, LocalDate date);
    long countByBranchIdAndDateAndStatus(Long branchId, LocalDate date, AttendanceStatus status);
    long countByDateAndStatus(LocalDate date, AttendanceStatus status);
    long countByBranchIdAndDate(Long branchId, LocalDate date);
    long countByDate(LocalDate date);
}
