import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { OWNER_API } from '../services/owner-api.interface';
import { SupabaseAuthService } from '../services/supabase-auth.service';
import { toApiError } from '../services/api-error';
import { OwnerUser } from '../models/owner-user.model';

/**
 * Login / Register (unified) [OWN-01] — W3-C1.
 * Supabase Auth handles register/login; Spring resolves roles via GET /api/owner/auth/me.
 * Post-login redirects (server-decided): admin → /admin, owner → /owner/dashboard,
 * tenant → /, suspended → suspended state (no owner actions). Mock mode (D-MOCK) signs in
 * the four fixture users with no network and redirects the same way.
 * Self-registration can never set role flags — the register payload has no role field. [D-REG]
 */
export type AuthState =
  | 'idle'
  | 'submitting'
  | 'invalid-credentials'
  | 'email-taken'
  | 'weak-password'
  | 'suspended'
  | 'check-email'
  | 'network'
  | 'success';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule],
  templateUrl: './auth.component.html',
})
export class AuthComponent implements OnInit {
  readonly api = inject(OWNER_API);
  private readonly supabase = inject(SupabaseAuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly isMock = environment.useMockApi;

  readonly state = signal<AuthState>('idle');
  readonly mode = signal<'login' | 'register'>('login');
  readonly serverMessage = signal('');
  readonly suspendedReason = signal('');

  /** Login form (also the base controls for register). */
  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  /** Register form — display name 2–120 [DB profiles.display_name], optional phone_number. */
  readonly registerForm: FormGroup = this.fb.group(
    {
      display_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm_password: ['', [Validators.required]],
      phone_number: ['', []],
    },
    { validators: this.passwordMatch },
  );

  get form(): FormGroup {
    return this.mode() === 'login' ? this.loginForm : this.registerForm;
  }

  ngOnInit(): void {
    // Already-signed-in visitors are redirected by role (page contract §4).
    void this.redirectIfSignedIn();
  }

  toggleMode(): void {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
    this.state.set('idle');
    this.serverMessage.set('');
  }

  toggleModeToLogin(): void {
    this.mode.set('login');
    this.state.set('idle');
    this.serverMessage.set('');
  }

  signOutAndStay(): void {
    if (this.isMock) {
      this.api.switchUser('');
    } else {
      void this.supabase.signOut().catch(() => undefined);
    }
    this.state.set('idle');
    this.mode.set('login');
  }

  async submit(): Promise<void> {
    if (this.state() === 'submitting') return;             // no double submit
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }
    this.state.set('submitting');
    this.serverMessage.set('');

    try {
      if (this.mode() === 'login') {
        await this.performLogin();
      } else {
        await this.performRegister();
      }
      // success path already redirected (or shows check-email/suspended)
    } catch (err) {
      this.applyAuthError(err);
    }
  }

  // ---------- Mock mode: pick a fixture user ----------
  mockSignIn(email: string): Promise<void> {
    return this.api.signInMock(email)
      .then(async user => {
        if (!user) {
          this.state.set('invalid-credentials');
          this.serverMessage.set('Invalid login credentials');
          return;
        }
        await this.redirectWith(this.api.getMe.bind(this.api));
      })
      .catch((err: unknown) => this.applyAuthError(err));
  }

  mockSignUp(dto: { display_name: string; email: string; password: string; phone_number?: string }): Promise<void> {
    return this.api.signUpMock(dto)
      .then(async () => {
        await this.redirectWith(this.api.getMe.bind(this.api));
      })
      .catch((err: unknown) => this.applyAuthError(err));
  }

  // ---------- Real mode ----------
  private async performLogin(): Promise<void> {
    const { email, password } = this.loginForm.value;
    await this.supabase.signIn(email, password);
    await this.redirectWith(() => this.api.getMe());
  }

  private async performRegister(): Promise<void> {
    const v = this.registerForm.value;
    const { requiresEmailConfirmation } = await this.supabase.signUp({
      display_name: v.display_name,
      email: v.email,
      password: v.password,
      phone_number: v.phone_number || undefined,
    });

    if (requiresEmailConfirmation) {
      this.state.set('check-email');
      return;
    }

    // Optional phone number is sent to the profile endpoint after sign-up [D-REG].
    if (v.phone_number) {
      try {
        await this.api.updateProfile({ phone_number: v.phone_number });
      } catch { /* profile update failure must not block sign-in; show below */ }
    }

    await this.redirectWith(() => this.api.getMe());
  }

  /**
   * Resolve roles via the server (never the client) and redirect per role matrix.
   * [page contract §4][AGENTS §0 rule 5]
   */
  private async redirectWith(getMe: () => Promise<OwnerUser>): Promise<void> {
    const me = await getMe();
    if (me.is_suspended) {
      // Suspended account: show the suspended state instead of owner actions. [W3-C1]
      this.suspendedReason.set(me.suspension_reason || 'Contact support for details.');
      this.state.set('suspended');
      return;
    }
    if (me.is_admin) {
      await this.router.navigate(['/admin']);            // read from app.routes.ts
    } else if (me.is_owner) {
      await this.router.navigate(['/owner/dashboard']);
    } else {
      await this.router.navigate(['/']);
    }
    this.state.set('success');
  }

  private async redirectIfSignedIn(): Promise<void> {
    try {
      if (this.isMock) {
        if (this.api.getMockSessionUser()) {
          await this.redirectWith(() => this.api.getMe());
        }
        return;
      }
      const session = await this.supabase.restoreSession();
      if (session) {
        await this.redirectWith(() => this.api.getMe());
      }
    } catch { /* no valid session → stay on the page */ }
  }

  /** Map Supabase / API errors onto the page states (W3-C1.3). */
  private applyAuthError(err: unknown): void {
    const e = toApiError(err);
    switch (e.kind) {
      case 'auth':
        this.state.set('invalid-credentials');
        this.serverMessage.set('Invalid login credentials. Check your email and password.');
        break;
      case 'conflict':
        this.state.set('email-taken');
        this.serverMessage.set('This email is already registered. Try logging in instead.');
        break;
      case 'validation': {
        const msg = e.message.toLowerCase();
        if (msg.includes('password')) {
          this.state.set('weak-password');
          this.serverMessage.set(e.message);
        } else {
          this.state.set('email-taken');
          this.serverMessage.set(e.message);
        }
        break;
      }
      case 'network':
        this.state.set('network');
        this.serverMessage.set(
          this.isMock ? 'Mock mode needs no backend.' : 'Cannot reach the server. Check your connection and try again.');
        break;
      default:
        this.state.set('invalid-credentials');
        this.serverMessage.set(e.message || 'Something went wrong. Please try again.');
    }
  }

  /** Confirm-password cross-field validator. */
  private passwordMatch(group: FormGroup): Record<string, boolean> | null {
    const pw = group.get('password')?.value;
    const confirm = group.get('confirm_password')?.value;
    return pw && confirm && pw !== confirm ? { passwordMismatch: true } : null;
  }

  control(name: string) {
    return this.form.get(name);
  }
}