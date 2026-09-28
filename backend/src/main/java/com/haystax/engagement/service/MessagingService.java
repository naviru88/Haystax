package com.haystax.engagement.service;

import com.haystax.engagement.dto.MessageDto;
import com.haystax.engagement.dto.MessageEvent;
import com.haystax.engagement.entity.MessageEntity;
import com.haystax.engagement.repository.MessageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class MessagingService {

    private final MessageRepository messageRepository;
    private final MessagePublisher  messagePublisher;

    public MessagingService(MessageRepository messageRepository,
                            MessagePublisher messagePublisher) {
        this.messageRepository = messageRepository;
        this.messagePublisher  = messagePublisher;
    }

    public List<MessageDto> getMessagesForConversation(UUID conversationId) {
        return messageRepository.findByConversationIdOrderBySentAtAsc(conversationId).stream()
                .map(this::mapToDto)
                .toList();
    }

    /**
     * Persists the message to the DB first (primary operation), then publishes
     * a {@link MessageEvent} to RabbitMQ for downstream consumers (notifications, etc.).
     * A RabbitMQ failure does NOT roll back the DB save.
     */
    @Transactional
    public MessageDto sendMessage(MessageDto dto) {
        // 1. Persist to DB
        MessageEntity entity = new MessageEntity();
        entity.setId(dto.getId() != null ? UUID.fromString(dto.getId()) : UUID.randomUUID());
        entity.setConversationId(dto.getRecipientId() != null ? UUID.fromString(dto.getRecipientId()) : UUID.randomUUID());
        entity.setSenderId(dto.getSenderId() != null ? UUID.fromString(dto.getSenderId()) : UUID.randomUUID());
        entity.setBody(dto.getContent());
        entity.setSentAt(OffsetDateTime.now());

        MessageEntity saved = messageRepository.save(entity);
        MessageDto    result = mapToDto(saved);

        // 2. Publish event to RabbitMQ (safe — exceptions are swallowed in publisher)
        MessageEvent event = new MessageEvent(
                saved.getId().toString(),
                saved.getConversationId().toString(),
                saved.getSenderId().toString(),
                result.getRecipientId(),
                saved.getBody(),
                saved.getSentAt().toLocalDateTime()
        );
        messagePublisher.publish(event);

        return result;
    }

    private MessageDto mapToDto(MessageEntity entity) {
        MessageDto dto = new MessageDto();
        dto.setId(entity.getId().toString());
        dto.setType("MESSAGE");
        dto.setSenderId(entity.getSenderId().toString());
        dto.setRecipientId(entity.getConversationId().toString());
        dto.setContent(entity.getBody());
        dto.setRead(true);
        dto.setCreatedAt(entity.getSentAt().toLocalDateTime());
        return dto;
    }
}
