package com.haystax.engagement.event;

import java.util.function.Consumer;

public interface EngagementEventBus {
    void publish(EngagementEvent event);

    void subscribe(String eventType, Consumer<EngagementEvent> handler);
}
