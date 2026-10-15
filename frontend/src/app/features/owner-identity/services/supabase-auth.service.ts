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

  signUp(dto: SignUpRequest): Promise<{ requiresEmailConfirmation: boolean }> {
    const client = this.client();
    return client.auth
      .signUp({
        email: dto.email,
        password: dto.password,
        options: {
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
