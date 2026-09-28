package com.haystax.engagement.dto;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Serializable event payload published to RabbitMQ when a message is sent.
 * Kept intentionally flat (no JPA entities) to avoid serialisation coupling.
 */
public class MessageEvent implements Serializable {

    private String messageId;
    private String conversationId;
    private String senderId;
    private String recipientId;
    private String content;
    private LocalDateTime sentAt;

    // ── No-arg constructor required by Jackson ────────────────────────────────
    public MessageEvent() {}

    public MessageEvent(String messageId,
                        String conversationId,
                        String senderId,
                        String recipientId,
                        String content,
                        LocalDateTime sentAt) {
        this.messageId      = messageId;
        this.conversationId = conversationId;
        this.senderId       = senderId;
        this.recipientId    = recipientId;
        this.content        = content;
        this.sentAt         = sentAt;
    }

    // ── Getters & Setters ─────────────────────────────────────────────────────
    public String getMessageId()      { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getSenderId()       { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public String getRecipientId()    { return recipientId; }
    public void setRecipientId(String recipientId) { this.recipientId = recipientId; }

    public String getContent()        { return content; }
    public void setContent(String content) { this.content = content; }

    public LocalDateTime getSentAt()  { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }

    @Override
    public String toString() {
        return "MessageEvent{messageId='" + messageId + "', senderId='" + senderId +
               "', conversationId='" + conversationId + "', sentAt=" + sentAt + "}";
    }
}
