package com.haystax.engagement.service;

import com.haystax.config.RabbitMQConfig;
import com.haystax.engagement.dto.MessageEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

/**
 * Publishes {@link MessageEvent}s to the RabbitMQ topic exchange.
 *
 * <p>Failures are caught and logged — a publish failure will NOT roll back
 * the database transaction so messages are never lost from the DB.</p>
 */
@Service
public class MessagePublisher {

    private static final Logger log = LoggerFactory.getLogger(MessagePublisher.class);

    private final RabbitTemplate rabbitTemplate;

    public MessagePublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    /**
     * Publishes a message event to the exchange after the DB save succeeds.
     *
     * @param event the event payload to publish
     */
    public void publish(MessageEvent event) {
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE_NAME,
                    RabbitMQConfig.ROUTING_KEY,
                    event
            );
            log.info("[RabbitMQ] Published MessageEvent: {}", event);
        } catch (AmqpException ex) {
            // Safe degradation: log the failure but do NOT propagate.
            // The message is already persisted in the DB.
            log.error("[RabbitMQ] Failed to publish MessageEvent for messageId={} — broker may be down. " +
                      "Message is still saved in DB.", event.getMessageId(), ex);
        }
    }
}
