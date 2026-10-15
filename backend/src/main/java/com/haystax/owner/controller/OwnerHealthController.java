package com.haystax.owner.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Week 1 (C2) public health endpoint for the owner slice.
 * <p>
 * The only owner endpoint NOT behind the (not-yet-wired) JWT filter in Week 1 —
 * matches AGENTS.md section 4 C2: {@code GET /api/owner/health} returns
 * {@code {"status":"ok","slice":"owner"}}.
 */
@RestController
@RequestMapping("/api/owner/health")
public class OwnerHealthController {

    @GetMapping
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "slice", "owner"));
    }
}