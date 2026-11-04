package com.haystax.engagement.service;

import com.haystax.engagement.entity.NotificationEntity;
import com.haystax.engagement.event.EngagementEvent;
import com.haystax.engagement.event.MessageCreatedEvent;
import com.haystax.engagement.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public NotificationEntity createForMessage(MessageCreatedEvent event) {
        NotificationEntity notification = new NotificationEntity();
        notification.setId(UUID.randomUUID());
        notification.setRecipientId(event.recipientId());
        notification.setType("MESSAGE");
        notification.setTitle("New message");
        notification.setBody("You have received a new message.");
        notification.setConversationId(event.aggregateId());
        notification.setRead(false);
        notification.setCreatedAt(OffsetDateTime.now());
        return notificationRepository.save(notification);
    }

    public void handle(EngagementEvent event) {
        if (!(event instanceof MessageCreatedEvent messageEvent)) {
            return;
        }
        createForMessage(messageEvent);
    }
}
