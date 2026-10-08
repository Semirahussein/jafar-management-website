package com.jafar.management.repository;

import com.jafar.management.dto.enums.DeliveryStatus;
import com.jafar.management.model.ParentNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ParentNotificationRepository extends JpaRepository<ParentNotification, Long> {
    List<ParentNotification> findAllByStudentId(Long studentId);
    List<ParentNotification> findAllByBranchId(Long branchId);
    List<ParentNotification> findAllByDeliveryStatus(DeliveryStatus status);
    List<ParentNotification> findAllByBranchIdAndCreatedAtBetween(Long branchId, LocalDateTime start, LocalDateTime end);
    List<ParentNotification> findAllByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    List<ParentNotification> findAllByStudentIdOrderByCreatedAtDesc(Long studentId);
    long countByDeliveryStatus(DeliveryStatus status);
    long countByBranchIdAndDeliveryStatus(Long branchId, DeliveryStatus status);
}
