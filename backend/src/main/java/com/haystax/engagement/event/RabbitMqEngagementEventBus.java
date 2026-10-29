package com.haystax.engagement.event;

import com.haystax.config.RabbitMQConfig;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
@ConditionalOnProperty(name = "engagement.event-bus", havingValue = "rabbit")
public class RabbitMqEngagementEventBus implements EngagementEventBus {
    private final RabbitTemplate rabbitTemplate;
    private final Map<String, List<Consumer<EngagementEvent>>> handlers = new ConcurrentHashMap<>();

    public RabbitMqEngagementEventBus(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @Override
    public void publish(EngagementEvent event) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                event.eventType(),
                event
        );
        for (Consumer<EngagementEvent> handler : handlers.getOrDefault(event.eventType(), List.of())) {
            handler.accept(event);
        }
    }

    @Override
    public void subscribe(String eventType, Consumer<EngagementEvent> handler) {
        handlers.computeIfAbsent(eventType, ignored -> new CopyOnWriteArrayList<>()).add(handler);
    }
}
