package com.haystax.engagement.service;

import com.haystax.engagement.event.EngagementEventBus;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class EngagementEventSubscription {
    private final EngagementEventBus eventBus;
    private final NotificationService notificationService;

    public EngagementEventSubscription(EngagementEventBus eventBus, NotificationService notificationService) {
        this.eventBus = eventBus;
        this.notificationService = notificationService;
    }

    @PostConstruct
    void registerHandlers() {
        eventBus.subscribe("message.created", notificationService::handle);
    }
}
