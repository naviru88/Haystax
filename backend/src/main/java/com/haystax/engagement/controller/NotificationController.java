package com.haystax.engagement.controller;

import com.haystax.engagement.dto.NotificationDto;
import com.haystax.engagement.service.NotificationService;
import com.haystax.engagement.auth.RequestScopedCurrentUser;
import com.haystax.engagement.dto.PageResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/engagement/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final RequestScopedCurrentUser currentUser;

    public NotificationController(NotificationService notificationService,
                                  RequestScopedCurrentUser currentUser) {
        this.notificationService = notificationService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public PageResponse<NotificationDto> listMine(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean unreadOnly) {
        UUID recipientId = requireUser();
        List<NotificationDto> all = notificationService.getForRecipient(recipientId, unreadOnly).stream()
                .map(NotificationDto::from)
                .toList();
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        int from = Math.min(safePage * safeSize, all.size());
        int to = Math.min(from + safeSize, all.size());
        return new PageResponse<>(all.subList(from, to),
                new PageResponse.PageMetadata(safePage, safeSize, all.size(),
                        (int) Math.ceil((double) all.size() / safeSize)));
    }

    @GetMapping("/unread-count")
    public UnreadCountDto unreadCount() {
        return new UnreadCountDto(notificationService.unreadCount(requireUser()));
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<NotificationDto> markRead(@PathVariable UUID notificationId) {
        return ResponseEntity.ok(NotificationDto.from(
                notificationService.markRead(notificationId, requireUser())));
    }

    private UUID requireUser() {
        UUID id = currentUser.getId();
        if (id == null) throw new SecurityException("Authentication is required");
        return id;
    }

    public record UnreadCountDto(long unreadCount) { }
}
