package com.haystax.engagement;

import com.haystax.engagement.event.EngagementEvent;
import com.haystax.engagement.event.InMemoryEngagementEventBus;
import com.haystax.engagement.event.VersionedEngagementEvent;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class InMemoryEngagementEventBusTest {
    @Test
    void publishesToMatchingHandler() {
        InMemoryEngagementEventBus bus = new InMemoryEngagementEventBus();
        AtomicInteger calls = new AtomicInteger();
        EngagementEvent event = event("message.created");

        bus.subscribe("message.created", ignored -> calls.incrementAndGet());
        bus.publish(event);

        assertEquals(1, calls.get());
    }

    @Test
    void retriesHandlerAndSucceeds() {
        InMemoryEngagementEventBus bus = new InMemoryEngagementEventBus();
        AtomicInteger calls = new AtomicInteger();

        bus.subscribe("message.created", ignored -> {
            if (calls.incrementAndGet() < 3) {
                throw new IllegalStateException("temporary");
            }
        });

        bus.publish(event("message.created"));

        assertEquals(3, calls.get());
    }

    @Test
    void surfacesFailureAfterRetryLimit() {
        InMemoryEngagementEventBus bus = new InMemoryEngagementEventBus();
        AtomicInteger calls = new AtomicInteger();
        bus.subscribe("message.created", ignored -> {
            calls.incrementAndGet();
            throw new IllegalStateException("permanent");
        });

        assertThrows(IllegalStateException.class, () -> bus.publish(event("message.created")));
        assertEquals(3, calls.get());
    }

    private EngagementEvent event(String type) {
        return new VersionedEngagementEvent(
                UUID.randomUUID(), type, 1, OffsetDateTime.now(),
                UUID.randomUUID(), UUID.randomUUID(), "payload");
    }
}
