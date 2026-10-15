package com.haystax.owner.service;

import org.springframework.stereotype.Service;

/**
 * Week 1 (C2) skeleton stub.
 * <p>
 * Week 2+: create / read / update / publish listings scoped to the owning owner
 * ({@code WHERE owner_id = :tokenSubject} — Spring enforces ownership because the
 * DB owner role bypasses RLS, DB notes issue #2). {@code owner_id} is always
 * resolved from the token, never from the request body.
 */
@Service
public class ListingWriteService {
}