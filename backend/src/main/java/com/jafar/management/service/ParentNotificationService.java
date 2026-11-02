package com.jafar.management.service;

import com.jafar.management.dto.enums.DeliveryStatus;
import com.jafar.management.dto.enums.NotificationType;
import com.jafar.management.model.ParentNotification;
import com.jafar.management.model.NotificationDeliveryAttempt;
import com.jafar.management.model.Student;
import com.jafar.management.repository.NotificationDeliveryAttemptRepository;
import com.jafar.management.repository.ParentNotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class ParentNotificationService {
    private final ParentNotificationRepository notifications;
    private final NotificationDeliveryAttemptRepository attempts;
    private final Optional<NotificationDeliveryProvider> provider;
    private final Clock clock;

    public ParentNotificationService(ParentNotificationRepository notifications,
            NotificationDeliveryAttemptRepository attempts,
            Optional<NotificationDeliveryProvider> provider, Clock clock) {
        this.notifications = notifications;
        this.attempts = attempts;
        this.provider = provider;
        this.clock = clock;
    }

    @Transactional
    public ParentNotification create(Student student, NotificationType type, String content,
            Long relatedProgressId, Long createdById, String idempotencyKey) {
        ParentNotification existing = notifications.findByIdempotencyKey(idempotencyKey).orElse(null);
        if (existing != null) {
            if (existing.getStudentId().equals(student.getId()) && existing.getNotificationType() == type
                    && existing.getContent().equals(content.trim()) && java.util.Objects.equals(existing.getRelatedProgressId(), relatedProgressId)
                    && java.util.Objects.equals(existing.getCreatedById(), createdById)) return existing;
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Idempotency key was already used for a different notification");
        }

        ParentNotification notification = new ParentNotification();
        notification.setStudentId(student.getId());
        notification.setParentName(student.getGuardianName().trim());
        notification.setParentContact(student.getGuardianPhone().trim());
        notification.setNotificationType(type);
        notification.setContent(content.trim());
        notification.setRelatedProgressId(relatedProgressId);
        notification.setCreatedById(createdById);
        notification.setIdempotencyKey(idempotencyKey);
        notification.setBranchId(student.getBranchId());
        notification.setDeliveryStatus(DeliveryStatus.PENDING);
        notification.setCreatedAt(LocalDateTime.now(clock));
        return notifications.saveAndFlush(notification);
    }

    @Transactional
    public DeliveryAttempt deliver(Long notificationId) {
        ParentNotification notification = notifications.findByIdForUpdate(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (notification.getDeliveryStatus() == DeliveryStatus.SENT
                || notification.getDeliveryStatus() == DeliveryStatus.DELIVERED) {
            return new DeliveryAttempt(notification, "Already submitted to delivery provider.");
        }
        if (provider.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Notification delivery is not configured. The notification remains pending.");
        }
        if (notification.getDeliveryStatus() != DeliveryStatus.PENDING && notification.getDeliveryStatus() != DeliveryStatus.FAILED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Notification is not in a sendable state");
        }

        NotificationDeliveryProvider configuredProvider = provider.get();
        notification.setDeliveryChannel(limit(configuredProvider.channel(), 40));
        String key = notification.getIdempotencyKey() == null ? "notification-" + notification.getId() : notification.getIdempotencyKey();
        LocalDateTime attemptedAt = LocalDateTime.now(clock);
        notification.setAttemptCount(notification.getAttemptCount() + 1);
        notification.setLastAttemptAt(attemptedAt);
        NotificationDeliveryAttempt attempt = new NotificationDeliveryAttempt();
        attempt.setNotificationId(notification.getId());
        attempt.setAttemptNumber(notification.getAttemptCount());
        attempt.setChannel(notification.getDeliveryChannel());
        attempt.setAttemptedAt(attemptedAt);
        NotificationDeliveryProvider.DeliveryResult result;
        try {
            result = configuredProvider.deliver(notification, key);
        } catch (Exception providerFailure) {
            result = new NotificationDeliveryProvider.DeliveryResult(DeliveryStatus.FAILED, null, null,
                    "Delivery provider request failed. Retry may be attempted with the same idempotency key.");
        }
        if (result == null || result.status() == null || result.status() == DeliveryStatus.PENDING)
            result = new NotificationDeliveryProvider.DeliveryResult(DeliveryStatus.FAILED, null, null,
                    "Delivery provider returned an invalid response. Retry may be attempted with the same idempotency key.");

        notification.setDeliveryStatus(result.status());
        notification.setProviderMessageId(limit(result.providerMessageId(), 200));
        notification.setProviderResponse(limit(result.providerResponse(), 4000));
        notification.setFailureReason(result.status() == DeliveryStatus.FAILED ? limit(result.failureReason(), 2000) : null);
        attempt.setStatus(result.status());
        attempt.setProviderMessageId(notification.getProviderMessageId());
        attempt.setProviderResponse(notification.getProviderResponse());
        attempt.setFailureReason(notification.getFailureReason());
        if (result.status() == DeliveryStatus.SENT || result.status() == DeliveryStatus.DELIVERED)
            notification.setSentAt(attemptedAt);
        if (result.status() == DeliveryStatus.DELIVERED) notification.setDeliveredAt(LocalDateTime.now(clock));
        attempts.save(attempt);
        return new DeliveryAttempt(notifications.save(notification), result.failureReason());
    }

    private static String limit(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }

    public record DeliveryAttempt(ParentNotification notification, String message) {}
}
