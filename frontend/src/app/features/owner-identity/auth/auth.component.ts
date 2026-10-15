import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OWNER_API } from '../services/owner-api.interface';
import { OwnerUser } from '../models/owner-user.model';

/**
 * Login / Register (unified) — Week 1 skeleton [OWN-01].
 * Supabase Auth handles register/login (client-side); spring resolves roles via
 * GET /api/owner/auth/me. Post-login redirects: admin -> /admin, owner -> /owner/dashboard,
 * tenant -> /. Self-registration can never set role flags. [AGENTS §1 roles]
 */
@Component({
  selector: 'app-auth',
  imports: [],
  templateUrl: './auth.component.html',
})
export class AuthComponent {
  readonly api = inject(OWNER_API);
  private readonly router = inject(Router);

  readonly mode = signal<'login' | 'register'>('login');
  readonly showRoles = signal(false);

  toggleMode(): void {
    this.mode.update(m => (m === 'login' ? 'register' : 'login'));
  }

  setShowRoles(v: boolean): void {
    this.showRoles.set(v);
  }

  /** Week-1 mock: pick a fixture user to land on their post-login destination. */
  mockLogin(u: OwnerUser): void {
    this.api.switchUser(u.id);
    if (u.isAdmin) {
      void this.router.navigate(['/admin']);
    } else if (u.isOwner) {
      void this.router.navigate(['/owner/dashboard']);
    } else {
      void this.router.navigate(['/']);
    }
  }
}
