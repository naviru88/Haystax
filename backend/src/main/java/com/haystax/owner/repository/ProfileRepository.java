package com.haystax.owner.repository;

import com.haystax.owner.entity.ProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Week 1 (C2) skeleton — read access to the existing {@code public.profiles} table.
 * <p>
 * No schema generation (application.yml sets {@code ddl-auto: none}). Week 2+
 * adds token-subject lookups for {@code /api/owner/auth/me} and profile CRUD.
 */
@Repository
public interface ProfileRepository extends JpaRepository<ProfileEntity, UUID> {
}