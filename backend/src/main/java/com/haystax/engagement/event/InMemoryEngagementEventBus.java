package com.haystax.engagement.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

@Component
@ConditionalOnProperty(name = "engagement.event-bus", havingValue = "memory", matchIfMissing = true)
public class InMemoryEngagementEventBus implements EngagementEventBus {
    private static final Logger log = LoggerFactory.getLogger(InMemoryEngagementEventBus.class);
    private static final int MAX_ATTEMPTS = 3;

    private final Map<String, List<Consumer<EngagementEvent>>> handlers = new ConcurrentHashMap<>();

    @Override
    public void publish(EngagementEvent event) {
        for (Consumer<EngagementEvent> handler : handlers.getOrDefault(event.eventType(), List.of())) {
            runWithRetry(event, handler);
        }
    }

    @Override
    public void subscribe(String eventType, Consumer<EngagementEvent> handler) {
        handlers.computeIfAbsent(eventType, ignored -> new CopyOnWriteArrayList<>()).add(handler);
    }

    private void runWithRetry(EngagementEvent event, Consumer<EngagementEvent> handler) {
        RuntimeException failure = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                handler.accept(event);
                return;
            } catch (RuntimeException ex) {
                failure = ex;
                log.warn("Engagement event handler failed for {} (attempt {}/{})",
                        event.eventType(), attempt, MAX_ATTEMPTS, ex);
            }
        }
        throw failure;
    }
}
