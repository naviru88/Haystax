package com.haystax.engagement.controller;

import com.haystax.engagement.dto.MessageDto;
import com.haystax.engagement.service.MessagingService;
import com.haystax.engagement.dto.PageResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/engagement/messages")
public class MessageController {

    private final MessagingService messagingService;

    public MessageController(MessagingService messagingService) {
        this.messagingService = messagingService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<MessageDto>> getMessages(
            @RequestParam UUID conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<MessageDto> all = messagingService.getMessagesForConversation(conversationId);
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        int from = Math.min(safePage * safeSize, all.size());
        int to = Math.min(from + safeSize, all.size());
        return ResponseEntity.ok(new PageResponse<>(all.subList(from, to),
                new PageResponse.PageMetadata(safePage, safeSize, all.size(),
                        (int) Math.ceil((double) all.size() / safeSize))));
    }

    @PostMapping
    public ResponseEntity<MessageDto> sendMessage(@RequestBody MessageDto messageDto) {
        MessageDto sent = messagingService.sendMessage(messageDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(sent);
    }
}
