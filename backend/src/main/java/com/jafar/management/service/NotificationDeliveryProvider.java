package com.jafar.management.service;

import com.jafar.management.dto.enums.DeliveryStatus;
import com.jafar.management.model.ParentNotification;

/**
 * Implement this SPI only after the owner selects and configures a delivery provider.
 * Adapters must use the supplied idempotency key and return only sanitized provider metadata;
 * credentials, authorization headers, and unnecessary recipient data must never be returned.
 */
public interface NotificationDeliveryProvider {
    String channel();

    DeliveryResult deliver(ParentNotification notification, String idempotencyKey) throws Exception;

    record DeliveryResult(DeliveryStatus status, String providerMessageId, String providerResponse,
            String failureReason) {}
}
