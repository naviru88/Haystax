/**
 * Owner & Identity — profile model.
 * Field names align with public.profiles (see docs/m2-db-notes.md). [DB profiles.*]
 * Roles are server-decided; the client never sends isOwner/isAdmin/isSuspended. [AGENTS §0 rule 5]
 */
export interface OwnerUser {
  id: string;                    // [DB profiles.id]
  displayName: string;           // [DB profiles.display_name]
  email: string;                 // Supabase Auth identity (auth.users.email)
  phoneNumber?: string;          // [DB profiles.phone_number]
  avatarPath?: string;           // [DB profiles.avatar_path]
  isOwner: boolean;              // [DB profiles.is_owner]
  isAdmin: boolean;              // [DB profiles.is_admin]
  isSuspended: boolean;          // [DB profiles.is_suspended]
  suspensionReason?: string;     // [DB profiles.suspension_reason] (read-only display)
  lastSeenAt?: string;           // [DB profiles.last_seen_at]
}
