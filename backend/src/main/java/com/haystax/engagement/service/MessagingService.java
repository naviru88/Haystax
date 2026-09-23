package com.haystax.engagement.service;

import com.haystax.engagement.dto.MessageDto;
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

    public MessagingService(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }

    public List<MessageDto> getMessagesForConversation(UUID conversationId) {
        return messageRepository.findByConversationIdOrderBySentAtAsc(conversationId).stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional
    public MessageDto sendMessage(MessageDto dto) {
        MessageEntity entity = new MessageEntity();
        entity.setId(dto.getId() != null ? UUID.fromString(dto.getId()) : UUID.randomUUID());
        entity.setConversationId(dto.getRecipientId() != null ? UUID.fromString(dto.getRecipientId()) : UUID.randomUUID());
        entity.setSenderId(dto.getSenderId() != null ? UUID.fromString(dto.getSenderId()) : UUID.randomUUID());
        entity.setBody(dto.getContent());
        entity.setSentAt(OffsetDateTime.now());

        MessageEntity saved = messageRepository.save(entity);
        return mapToDto(saved);
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
