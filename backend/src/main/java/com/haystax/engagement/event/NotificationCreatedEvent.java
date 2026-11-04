package com.haystax.engagement.event;

import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationCreatedEvent(
        UUID eventId, int version, OffsetDateTime occurredAt, UUID aggregateId,
        UUID actorId, Object payload) implements EngagementEvent {
    @Override public String eventType() { return "notification.created"; }
}
