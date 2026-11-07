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
import com.haystax.engagement.dto.PageResponse;

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
    public ResponseEntity<PageResponse<TenancyDto>> getTenancies(
            @RequestParam(required = false) UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (userId != null && !userId.equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "userId must match the authenticated user");
        }
        List<TenancyDto> all = tenancyService.getTenanciesForUser(currentUser.getId());
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        int from = Math.min(safePage * safeSize, all.size());
        int to = Math.min(from + safeSize, all.size());
        PageResponse<TenancyDto> response = new PageResponse<>(
                all.subList(from, to),
                new PageResponse.PageMetadata(safePage, safeSize, all.size(),
                        (int) Math.ceil((double) all.size() / safeSize)));
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<TenancyDto> createTenancy(@RequestBody TenancyDto tenancyDto,
                                                    @RequestHeader(value = "Idempotency-Key", required = false)
                                                    String idempotencyKey) {
        TenancyDto created = tenancyService.createTenancyRequest(tenancyDto, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{tenancyId}")
    public ResponseEntity<TenancyDto> getTenancy(@PathVariable UUID tenancyId) {
        return ResponseEntity.ok(tenancyService.getTenancy(tenancyId));
    }

    @PatchMapping("/{tenancyId}")
    public ResponseEntity<TenancyDto> updateTenancy(@PathVariable UUID tenancyId,
                                                    @RequestBody TenancyDto update) {
        return ResponseEntity.ok(tenancyService.updateStatus(tenancyId, update.getStatus(), update.getNotes()));
    }
}
