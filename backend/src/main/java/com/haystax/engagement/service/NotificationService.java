package com.haystax.engagement.service;

import com.haystax.engagement.entity.NotificationEntity;
import com.haystax.engagement.event.EngagementEvent;
import com.haystax.engagement.event.MessageCreatedEvent;
import com.haystax.engagement.event.BookingCancelledEvent;
import com.haystax.engagement.event.BookingConfirmedEvent;
import com.haystax.engagement.event.BookingCreatedEvent;
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
        if (event instanceof MessageCreatedEvent messageEvent) {
            createForMessage(messageEvent);
        } else if (event instanceof BookingCreatedEvent bookingEvent) {
            createForBooking(bookingEvent, "BOOKING_CREATED", "Booking inquiry received");
        } else if (event instanceof BookingConfirmedEvent bookingEvent) {
            createForBooking(bookingEvent, "BOOKING_CONFIRMED", "Booking confirmed");
        } else if (event instanceof BookingCancelledEvent bookingEvent) {
            createForBooking(bookingEvent, "BOOKING_CANCELLED", "Booking cancelled");
        }
    }

    @Transactional
    public NotificationEntity createForBooking(EngagementEvent event, String type, String title) {
        if (!(event.payload() instanceof com.haystax.engagement.dto.TenancyDto booking)) {
            throw new IllegalArgumentException("Booking event payload is invalid");
        }
        NotificationEntity notification = new NotificationEntity();
        notification.setId(UUID.randomUUID());
        notification.setRecipientId(event.actorId().equals(booking.getTenantId())
                ? booking.getOwnerId() : booking.getTenantId());
        notification.setType(type);
        notification.setTitle(title);
        notification.setBody("Booking " + event.eventType().replace("booking.", "") + ".");
        notification.setListingId(booking.getListingId());
        notification.setTenancyId(booking.getId());
        notification.setRead(false);
        notification.setCreatedAt(OffsetDateTime.now());
        return notificationRepository.save(notification);
    }
}
