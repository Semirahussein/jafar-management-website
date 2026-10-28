package com.jafar.management.repository;

import com.jafar.management.dto.enums.DeliveryStatus;
import com.jafar.management.dto.enums.NotificationType;
import com.jafar.management.model.ParentNotification;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ParentNotificationRepository extends JpaRepository<ParentNotification, Long> {
    boolean existsByBranchId(Long branchId);
    boolean existsByStudentId(Long studentId);
    List<ParentNotification> findAllByStudentId(Long studentId);
    List<ParentNotification> findAllByBranchId(Long branchId);
    List<ParentNotification> findAllByDeliveryStatus(DeliveryStatus status);
    List<ParentNotification> findAllByBranchIdAndCreatedAtBetween(Long branchId, LocalDateTime start, LocalDateTime end);
    List<ParentNotification> findAllByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    List<ParentNotification> findAllByStudentIdOrderByCreatedAtDesc(Long studentId);
    long countByDeliveryStatus(DeliveryStatus status);
    long countByBranchIdAndDeliveryStatus(Long branchId, DeliveryStatus status);
    java.util.Optional<ParentNotification> findByIdempotencyKey(String idempotencyKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select n from ParentNotification n where n.id = :id")
    java.util.Optional<ParentNotification> findByIdForUpdate(@Param("id") Long id);

    @Query("select n from ParentNotification n where (:branchId is null or n.branchId = :branchId) "
            + "and (:teacherId is null or exists (select s.id from Student s where s.id = n.studentId and s.teacherId = :teacherId)) "
            + "and (:studentId is null or n.studentId = :studentId) "
            + "and (:search is null or lower(coalesce(n.parentName, '')) like lower(concat('%', :search, '%')) "
            + "or exists (select s.id from Student s where s.id = n.studentId and (lower(s.fullName) like lower(concat('%', :search, '%')) or lower(s.studentNumber) like lower(concat('%', :search, '%'))))) "
            + "and (:status is null or n.deliveryStatus = :status) "
            + "and (:type is null or n.notificationType = :type) "
            + "and (:startDate is null or n.createdAt >= :startDate) "
            + "and (:endDate is null or n.createdAt <= :endDate)")
    Page<ParentNotification> searchNotifications(@Param("branchId") Long branchId,
            @Param("teacherId") Long teacherId, @Param("studentId") Long studentId,
            @Param("search") String search, @Param("status") DeliveryStatus status, @Param("type") NotificationType type,
            @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate,
            Pageable pageable);
}
