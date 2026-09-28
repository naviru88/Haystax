package com.haystax.engagement.service;

import com.haystax.config.RabbitMQConfig;
import com.haystax.engagement.dto.MessageEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

/**
 * Consumes {@link MessageEvent}s from the RabbitMQ queue.
 *
 * <p>Current responsibilities:
 * <ul>
 *   <li>Log the received event (audit trail)</li>
 *   <li>TODO: Send push/email notification to recipient</li>
 *   <li>TODO: Update unread-count counter in DB/cache</li>
 * </ul>
 * </p>
 *
 * <p>If an exception is thrown the message will be re-queued by RabbitMQ
 * (default behaviour). Add a Dead Letter Queue if poison-message handling
 * is required in future.</p>
 */
@Service
public class MessageConsumer {

    private static final Logger log = LoggerFactory.getLogger(MessageConsumer.class);

    /**
     * Listens on {@value RabbitMQConfig#QUEUE_NAME} and processes incoming events.
     *
     * @param event the deserialized {@link MessageEvent}
     */
    @RabbitListener(queues = RabbitMQConfig.QUEUE_NAME)
    public void handleMessageEvent(MessageEvent event) {
        log.info("[RabbitMQ] Received MessageEvent: messageId={}, from={}, conversationId={}",
                event.getMessageId(),
                event.getSenderId(),
                event.getConversationId());

        try {
            processNotification(event);
        } catch (Exception ex) {
            log.error("[RabbitMQ] Error processing notification for messageId={}",
                    event.getMessageId(), ex);
            // Do NOT re-throw — prevents infinite requeue loop for now.
            // Add Dead Letter Queue (DLQ) when notification reliability is required.
        }
    }

    /**
     * Hook for notification processing. Extend this method when email/push
     * notification services are integrated.
     */
    private void processNotification(MessageEvent event) {
        // Phase 2 — wire in NotificationService here
        log.debug("[RabbitMQ] Notification hook triggered for recipientId={}",
                event.getRecipientId());
    }
}
