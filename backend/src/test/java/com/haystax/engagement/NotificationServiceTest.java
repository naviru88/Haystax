package com.haystax.engagement;

import com.haystax.engagement.entity.NotificationEntity;
import com.haystax.engagement.event.MessageCreatedEvent;
import com.haystax.engagement.repository.NotificationRepository;
import com.haystax.engagement.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NotificationServiceTest {
    @Test
    void createsUnreadNotificationForMessageEvent() {
        NotificationRepository repository = mock(NotificationRepository.class);
        NotificationService service = new NotificationService(repository);
        UUID recipientId = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();
        MessageCreatedEvent event = new MessageCreatedEvent(
                UUID.randomUUID(), 1, OffsetDateTime.now(), conversationId,
                UUID.randomUUID(), recipientId, "message");

        when(repository.save(any(NotificationEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        NotificationEntity saved = service.createForMessage(event);

        ArgumentCaptor<NotificationEntity> captor = ArgumentCaptor.forClass(NotificationEntity.class);
        verify(repository).save(captor.capture());
        assertEquals(recipientId, saved.getRecipientId());
        assertEquals(conversationId, captor.getValue().getConversationId());
        assertFalse(captor.getValue().isRead());
        assertEquals("MESSAGE", captor.getValue().getType());
    }
}
