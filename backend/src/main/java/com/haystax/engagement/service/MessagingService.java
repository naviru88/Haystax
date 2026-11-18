package com.haystax.engagement.service;

import com.haystax.engagement.auth.RequestScopedCurrentUser;
import com.haystax.engagement.dto.MessageDto;
import com.haystax.engagement.entity.MessageEntity;
import com.haystax.engagement.event.EngagementEventBus;
import com.haystax.engagement.event.MessageCreatedEvent;
import com.haystax.engagement.repository.ConversationParticipantRepository;
import com.haystax.engagement.repository.MessageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class MessagingService {

    private final MessageRepository messageRepository;
    private final EngagementEventBus eventBus;
    private final RequestScopedCurrentUser currentUser;
    private final ConversationParticipantRepository participantRepository;

    public MessagingService(MessageRepository messageRepository,
                            EngagementEventBus eventBus,
                            RequestScopedCurrentUser currentUser,
                            ConversationParticipantRepository participantRepository) {
        this.messageRepository = messageRepository;
        this.eventBus = eventBus;
        this.currentUser = currentUser;
        this.participantRepository = participantRepository;
    }

    public List<MessageDto> getMessagesForConversation(UUID conversationId) {
        UUID viewerId = requireCurrentUser();
        List<UUID> participants = requireParticipants(conversationId);
        if (!participants.contains(viewerId)) {
            throw new SecurityException("You cannot access this conversation");
        }
        return messageRepository.findByConversationIdOrderBySentAtAsc(conversationId).stream()
                .map(message -> mapToDto(message, otherParticipant(participants, message.getSenderId())))
                .toList();
    }

    /** Persist first, then publish a notification event for each other participant. */
    @Transactional
    public MessageDto sendMessage(MessageDto dto) {
        UUID senderId = requireCurrentUser();
        if (dto.getConversationId() == null) {
            throw new IllegalArgumentException("conversationId is required");
        }
        UUID conversationId = UUID.fromString(dto.getConversationId());
        List<UUID> participants = requireParticipants(conversationId);
        if (!participants.contains(senderId)) {
            throw new SecurityException("You cannot send messages to this conversation");
        }
        List<UUID> recipients = participants.stream().filter(id -> !id.equals(senderId)).toList();
        if (recipients.isEmpty()) {
            throw new IllegalArgumentException("Conversation has no other participant");
        }

        MessageEntity entity = new MessageEntity();
        entity.setId(UUID.randomUUID());
        entity.setConversationId(conversationId);
        entity.setSenderId(senderId);
        entity.setBody(dto.getContent());
        entity.setSentAt(OffsetDateTime.now());

        MessageEntity saved = messageRepository.save(entity);
        MessageDto result = mapToDto(saved, recipients.get(0));
        for (UUID recipientId : recipients) {
            eventBus.publish(new MessageCreatedEvent(
                    UUID.randomUUID(), 1, saved.getSentAt(), conversationId, senderId, recipientId, result));
        }
        return result;
    }

    private MessageDto mapToDto(MessageEntity entity, UUID recipientId) {
        MessageDto dto = new MessageDto();
        dto.setId(entity.getId().toString());
        dto.setType("MESSAGE");
        dto.setConversationId(entity.getConversationId().toString());
        dto.setSenderId(entity.getSenderId().toString());
        dto.setRecipientId(recipientId == null ? null : recipientId.toString());
        dto.setContent(entity.getBody());
        dto.setRead(false);
        dto.setCreatedAt(entity.getSentAt().toLocalDateTime());
        return dto;
    }

    private UUID requireCurrentUser() {
        UUID id = currentUser.getId();
        if (id == null) throw new SecurityException("Authentication is required");
        return id;
    }

    private List<UUID> requireParticipants(UUID conversationId) {
        List<UUID> participants = participantRepository.findUserIdsByConversationId(conversationId);
        if (participants.size() < 2) throw new IllegalArgumentException("Conversation was not found");
        return participants;
    }

    private UUID otherParticipant(List<UUID> participants, UUID senderId) {
        return participants.stream().filter(id -> !id.equals(senderId)).findFirst().orElse(null);
    }
}
