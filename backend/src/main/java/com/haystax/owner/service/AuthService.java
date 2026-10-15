package com.haystax.owner.service;

import org.springframework.stereotype.Service;

/**
 * Week 1 (C2) skeleton stub.
 * <p>
 * Week 2+: verify the Supabase-issued JWT (shared secret vs JWKS — see
 * {@code x-todo} in docs/api-contracts/openapi-owner.yaml) and resolve
 * is_owner / is_admin / is_suspended from {@code public.profiles} via the token
 * subject. Roles always come from server/DB/JWT, never from client claims
 * (AGENTS.md section 0 hard rule 5).
 */
@Service
public class AuthService {
}