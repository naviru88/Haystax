package com.haystax.owner.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Maps the EXISTING {@code public.profiles} table (AGENTS.md section 3).
 * <p>
 * No schema generation is allowed ({@code ddl-auto: none}) — this entity only
 * reads/writes the live table. {@code id} references {@code auth.users(id)}.
 */
@Entity
@Table(name = "profiles", schema = "public")
public class ProfileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "avatar_path")
    private String avatarPath;

    @Column(name = "is_owner", nullable = false)
    private boolean isOwner;

    @Column(name = "is_admin", nullable = false)
    private boolean isAdmin;

    @Column(name = "is_suspended", nullable = false)
    private boolean isSuspended;

    @Column(name = "suspension_reason")
    private String suspensionReason;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "last_seen_at")
    private OffsetDateTime lastSeenAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getAvatarPath() { return avatarPath; }
    public void setAvatarPath(String avatarPath) { this.avatarPath = avatarPath; }

    public boolean isOwner() { return isOwner; }
    public void setOwner(boolean isOwner) { this.isOwner = isOwner; }

    public boolean isAdmin() { return isAdmin; }
    public void setAdmin(boolean isAdmin) { this.isAdmin = isAdmin; }

    public boolean isSuspended() { return isSuspended; }
    public void setSuspended(boolean isSuspended) { this.isSuspended = isSuspended; }

    public String getSuspensionReason() { return suspensionReason; }
    public void setSuspensionReason(String suspensionReason) { this.suspensionReason = suspensionReason; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public OffsetDateTime getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(OffsetDateTime lastSeenAt) { this.lastSeenAt = lastSeenAt; }
}