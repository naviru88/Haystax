package com.haystax.engagement.dto;

import com.haystax.engagement.entity.NotificationEntity;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Response shape used by the Angular notification list. */
public record NotificationDto(
        UUID id,
        UUID recipientId,
        String type,
        String title,
        String body,
        UUID listingId,
        UUID conversationId,
        UUID tenancyId,
        boolean isRead,
        OffsetDateTime readAt,
        OffsetDateTime createdAt) {

    public static NotificationDto from(NotificationEntity entity) {
        return new NotificationDto(
                entity.getId(),
                entity.getRecipientId(),
                entity.getType(),
                entity.getTitle(),
                entity.getBody(),
                entity.getListingId(),
                entity.getConversationId(),
                entity.getTenancyId(),
                entity.isRead(),
                entity.getReadAt(),
                entity.getCreatedAt());
    }
}
