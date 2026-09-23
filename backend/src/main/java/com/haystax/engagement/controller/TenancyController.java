package com.haystax.engagement.controller;

import com.haystax.engagement.dto.TenancyDto;
import com.haystax.engagement.service.TenancyService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/engagement/tenancies")
public class TenancyController {

    private final TenancyService tenancyService;

    public TenancyController(TenancyService tenancyService) {
        this.tenancyService = tenancyService;
    }

    @GetMapping
    public ResponseEntity<List<TenancyDto>> getTenancies(@RequestParam String userId) {
        return ResponseEntity.ok(tenancyService.getTenanciesForUser(userId));
    }

    @PostMapping
    public ResponseEntity<TenancyDto> createTenancy(@RequestBody TenancyDto tenancyDto) {
        TenancyDto created = tenancyService.createTenancyRequest(tenancyDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
