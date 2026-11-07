/**
 * Owner & Identity — user/profile models.
 * Field names match the OpenAPI contract exactly (snake_case): docs/api-contracts/openapi-owner.yaml
 * (MeResponse / OwnerProfileResponse / ProfileUpdateRequest). [DB profiles.*]
 * Roles are server-decided; the client never sends is_owner/is_admin/is_suspended. [AGENTS §0 rule 5]
 */
export interface OwnerUser {
  id: string;                    // [DB profiles.id]
  display_name: string;          // [DB profiles.display_name]
  email: string;                 // Supabase Auth identity (auth.users.email)
  phone_number?: string;         // [DB profiles.phone_number]
  avatar_path?: string;          // [DB profiles.avatar_path] — object path, never a public URL
  is_owner: boolean;             // [DB profiles.is_owner]
  is_admin: boolean;             // [DB profiles.is_admin]
  is_suspended: boolean;         // [DB profiles.is_suspended]
  suspension_reason?: string;    // [DB profiles.suspension_reason] (read-only display)
  last_seen_at?: string;         // [DB profiles.last_seen_at]
}

/** GET /api/owner/profile (OwnerProfileResponse) — role flags not editable through it. */
export interface OwnerProfile {
  id: string;
  display_name: string;
  phone_number?: string;
  avatar_path?: string;
  last_seen_at?: string;
  is_owner: boolean;
  is_admin: boolean;
  is_suspended: boolean;
}

/** PUT /api/owner/profile — only these are editable; role flags are ignored server-side. */
export interface ProfileUpdate {
  display_name?: string;
  phone_number?: string;
  avatar_path?: string;
}

/** Supabase Auth sign-up payload. NEVER contains role fields. [D-REG][AGENTS §1 roles] */
export interface SignUpRequest {
  display_name: string;          // 2–120 [DB profiles.display_name]
  email: string;
  password: string;
  phone_number?: string;
}

export interface SignUpResult {
  requiresEmailConfirmation: boolean;  // "check your email" state instead of redirect
  user?: OwnerUser;
}
