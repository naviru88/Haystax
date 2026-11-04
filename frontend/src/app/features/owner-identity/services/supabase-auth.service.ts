import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

import { environment } from '../../../../environments/environment';
import { ApiError, FieldError } from './api-error';
import { SignUpRequest } from '../models/owner-user.model';

/**
 * Thin wrapper around the Supabase Auth client (the ONLY place supabase-js is used).
 * Auth (register/login) is Supabase's job; Spring resolves roles via GET /api/owner/auth/me.
 * [AGENTS-W3 D-ENV] The URL + anon key live in src/environments/* — placeholders by default;
 * fill them in locally (never commit real keys).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseAuthService {
  private readonly environment = environment;

  /** Emits the current session (or null on sign out) whenever it changes. */
  get sessionChanges(): Observable<Session | null> {
    const client = this.client();
    return new Observable<Session | null>(subscriber => {
      const { data } = client.auth.onAuthStateChange((_event, session) => subscriber.next(session));
      return () => data.subscription.unsubscribe();
    });
  }

  /**
   * Register via Supabase Auth. With Email Confirmations on (D-AUTH-FLOW) Supabase returns
   * no session: the user must click the emailed link before they can log in. There is no
   * admin-approval step anywhere in this flow — the Supabase link is the whole gate.
   */
  signUp(dto: SignUpRequest): Promise<{ requiresEmailConfirmation: boolean }> {
    const client = this.client();
    return client.auth
      .signUp({
        email: dto.email,
        password: dto.password,
        options: {
          // Where Supabase sends the user after they click the confirmation link.
          emailRedirectTo: this.emailRedirectTo(),
          // The signup trigger reads display_name from raw_user_meta_data under this key.
          // TODO(ask Anoj): confirm this is the exact key the signup trigger reads.
          data: { display_name: dto.display_name },
        },
      })
      .then(({ error, data }) => {
        if (error) throw this.mapSupabaseError(error);
        const requiresEmailConfirmation = !data.session;
        return { requiresEmailConfirmation };
      });
  }

  /** Re-send the Supabase signup confirmation mail (check-your-email state). [D-AUTH-FLOW] */
  resendConfirmation(email: string): Promise<void> {
    const client = this.client();
    return client.auth
      .resend({ type: 'signup', email, options: { emailRedirectTo: this.emailRedirectTo() } })
      .then(({ error }) => {
        if (error) throw this.mapSupabaseError(error);
      });
  }

  signIn(email: string, password: string): Promise<void> {
    const client = this.client();
    return client.auth
      .signInWithPassword({ email, password })
      .then(({ error }) => {
        if (error) throw this.mapSupabaseError(error);
      });
  }

  signOut(): Promise<void> {
    const client = this.client();
    return client.auth.signOut().then(() => undefined);
  }

  getAccessToken(): Promise<string | null> {
    const client = this.client();
    return client.auth.getSession().then(({ data }) => data.session?.access_token ?? null);
  }

  restoreSession(): Promise<Session | null> {
    const client = this.client();
    return client.auth.getSession().then(({ data }) => data.session ?? null);
  }

  /**
   * D-AUTH-FLOW: a session is only usable once Supabase has confirmed the email address.
   * With Email Confirmations on, Supabase does not issue a session for an unconfirmed
   * account, so this is a defensive gate for legacy/pre-confirmation sessions.
   */
  isEmailConfirmed(session: Session | null): boolean {
    if (!session) return false;
    return !!session.user.email_confirmed_at || !!session.user.confirmed_at;
  }

  /** Where Supabase should return the user after the confirmation link. */
  private emailRedirectTo(): string | undefined {
    // Browser only — SSR has no origin, and Supabase falls back to the project's Site URL.
    const origin = typeof location !== 'undefined' ? location.origin : '';
    return origin ? `${origin}/auth/login` : undefined;
  }

  /** Lazily create the client so an empty placeholder config fails loudly but only on use. */
  private client(): SupabaseClient {
    const { supabaseUrl, supabaseAnonKey } = this.environment;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Supabase is not configured. Add your project URL + anon key to src/environments/environment.local.ts ' +
        '(or environment.ts) — see AGENTS-W3.md D-ENV. Never commit real keys.'
      );
    }
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  private mapSupabaseError(error: { message: string; status?: number }): ApiError {
    const m = error.message?.toLowerCase() ?? '';
    const status = error.status ? Number(error.status) : null;

    if (m.includes('invalid login credentials')) {
      return new ApiError(401, 'auth', 'Invalid login credentials');
    }
    // D-AUTH-FLOW: email confirmation replaces the old admin-approval gate.
    if (m.includes('email not confirmed') || m.includes('not confirmed')) {
      return new ApiError(status ?? 403, 'unconfirmed', 'Please confirm your email before logging in.');
    }
    if (m.includes('already registered')) {
      return new ApiError(409, 'conflict', 'This email is already registered');
    }
    if (m.includes('password')) {
      const fieldErrors: FieldError[] = [{ field: 'password', message: error.message }];
      return new ApiError(status ?? 422, 'validation', error.message, fieldErrors);
    }
    if (m.includes('email')) {
      const fieldErrors: FieldError[] = [{ field: 'email', message: error.message }];
      return new ApiError(status ?? 422, 'validation', error.message, fieldErrors);
    }
    return new ApiError(status, status === 401 ? 'auth' : 'server', error.message);
  }
}
