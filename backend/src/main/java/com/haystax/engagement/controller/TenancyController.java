package com.haystax.engagement.controller;

import com.haystax.engagement.dto.TenancyDto;
import com.haystax.engagement.auth.CurrentUser;
import com.haystax.engagement.service.TenancyService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/engagement/tenancies")
public class TenancyController {

    private final TenancyService tenancyService;
    private final CurrentUser currentUser;

    public TenancyController(TenancyService tenancyService, CurrentUser currentUser) {
        this.tenancyService = tenancyService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public ResponseEntity<List<TenancyDto>> getTenancies(
            @RequestParam(required = false) UUID userId) {
        if (userId != null && !userId.equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "userId must match the authenticated user");
        }
        return ResponseEntity.ok(tenancyService.getTenanciesForUser(currentUser.getId()));
    }

    @PostMapping
    public ResponseEntity<TenancyDto> createTenancy(@RequestBody TenancyDto tenancyDto) {
        TenancyDto created = tenancyService.createTenancyRequest(tenancyDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
