package com.haystax.engagement.event;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface EngagementEvent {
    UUID eventId();
    String eventType();
    int version();
    OffsetDateTime occurredAt();
    UUID aggregateId();
    UUID actorId();
    Object payload();
}
