package com.haystax.engagement.event;

import java.time.OffsetDateTime;
import java.util.UUID;

public record VersionedEngagementEvent(
        UUID eventId,
        String eventType,
        int version,
        OffsetDateTime occurredAt,
        UUID aggregateId,
        UUID actorId,
        Object payload) implements EngagementEvent {
}
