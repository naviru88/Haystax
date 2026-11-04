package com.haystax.engagement.repository;

import com.haystax.engagement.entity.NotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NotificationRepository extends JpaRepository<NotificationEntity, UUID> {
    long countByRecipientIdAndReadFalse(UUID recipientId);
}
