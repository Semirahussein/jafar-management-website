package com.jafar.management.repository;

import com.jafar.management.model.TeacherAttendance;
import com.jafar.management.dto.enums.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeacherAttendanceRepository extends JpaRepository<TeacherAttendance, Long> {
    boolean existsByBranchId(Long branchId);
    List<TeacherAttendance> findAllByBranchId(Long branchId);
    List<TeacherAttendance> findAllByTeacherId(Long teacherId);
    List<TeacherAttendance> findAllByBranchIdAndDateBetween(Long branchId, LocalDate start, LocalDate end);
    List<TeacherAttendance> findAllByDateBetween(LocalDate start, LocalDate end);
    boolean existsByTeacherIdAndDate(Long teacherId, LocalDate date);
    @Query("select a from TeacherAttendance a where a.date between :start and :end and (:branchId is null or a.branchId = :branchId) and (:teacherId is null or a.teacherId = :teacherId) and (:status is null or a.status = :status) and (:q is null or exists (select u.id from AppUser u where u.id = a.teacherId and (lower(u.username) like lower(concat('%', :q, '%')) or lower(coalesce(u.fullName, '')) like lower(concat('%', :q, '%')))))")
    Page<TeacherAttendance> searchAttendance(@Param("start") LocalDate start, @Param("end") LocalDate end,
            @Param("branchId") Long branchId, @Param("teacherId") Long teacherId,
            @Param("status") AttendanceStatus status, @Param("q") String q, Pageable pageable);
    long countByBranchIdAndDateAndStatus(Long branchId, LocalDate date, AttendanceStatus status);
    long countByDateAndStatus(LocalDate date, AttendanceStatus status);
    long countByBranchIdAndDate(Long branchId, LocalDate date);
    long countByDate(LocalDate date);
}
