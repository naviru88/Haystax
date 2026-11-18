package com.haystax.engagement.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/** Read-only access to conversation membership for message authorization. */
@Repository
public class ConversationParticipantRepository {

    @PersistenceContext
    private EntityManager entityManager;

    @SuppressWarnings("unchecked")
    public List<UUID> findUserIdsByConversationId(UUID conversationId) {
        return entityManager.createNativeQuery(
                        "select user_id from public.conversation_participants where conversation_id = :conversationId")
                .setParameter("conversationId", conversationId)
                .getResultList();
    }
}
