package com.haystax.engagement.controller;

import com.haystax.engagement.dto.MessageDto;
import com.haystax.engagement.service.MessagingService;
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
    public ResponseEntity<List<MessageDto>> getMessages(@RequestParam UUID conversationId) {
        return ResponseEntity.ok(messagingService.getMessagesForConversation(conversationId));
    }

    @PostMapping
    public ResponseEntity<MessageDto> sendMessage(@RequestBody MessageDto messageDto) {
        MessageDto sent = messagingService.sendMessage(messageDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(sent);
    }
}
