package com.jafar.management.repository;

import com.jafar.management.model.NotificationDeliveryAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationDeliveryAttemptRepository extends JpaRepository<NotificationDeliveryAttempt, Long> {
    List<NotificationDeliveryAttempt> findAllByNotificationIdOrderByAttemptedAtDesc(Long notificationId);
}
