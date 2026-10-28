package com.haystax.engagement.service;

import com.haystax.config.RabbitMQConfig;
import com.haystax.engagement.dto.MessageEvent;
import com.haystax.engagement.event.EngagementEventBus;
import com.haystax.engagement.event.MessageCreatedEvent;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "engagement.event-bus", havingValue = "rabbit")
public class MessageConsumer {
    private final EngagementEventBus eventBus;

    public MessageConsumer(EngagementEventBus eventBus) {
        this.eventBus = eventBus;
    }

    @RabbitListener(queues = RabbitMQConfig.QUEUE_NAME)
    public void handleMessageEvent(MessageEvent event) {
        eventBus.publish(new MessageCreatedEvent(
                UUID.fromString(event.getMessageId()),
                1,
                event.getSentAt() == null
                        ? OffsetDateTime.now()
                        : event.getSentAt().atOffset(ZoneOffset.UTC),
                UUID.fromString(event.getConversationId()),
                UUID.fromString(event.getSenderId()),
                UUID.fromString(event.getRecipientId()),
                event
        ));
    }
}
