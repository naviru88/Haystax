package com.haystax.engagement.repository;

import com.haystax.engagement.entity.NotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<NotificationEntity, UUID> {
    long countByRecipientIdAndReadFalse(UUID recipientId);
    List<NotificationEntity> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId);
    List<NotificationEntity> findByRecipientIdAndReadFalseOrderByCreatedAtDesc(UUID recipientId);
    Optional<NotificationEntity> findByIdAndRecipientId(UUID id, UUID recipientId);
}
