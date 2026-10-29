package com.haystax.engagement.event;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MessageCreatedEvent(
        UUID eventId, int version, OffsetDateTime occurredAt, UUID aggregateId,
        UUID actorId, UUID recipientId, Object payload) implements EngagementEvent {
    @Override public String eventType() { return "message.created"; }
}
