import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { OWNER_API } from '../services/owner-api.interface';
import { SupabaseAuthService } from '../services/supabase-auth.service';

/**
 * authGuard — a session must exist, else redirect to /auth/login.
 * Real mode: checks Supabase's persisted session. Mock mode (D-MOCK): checks whether a
 * fixture user has signed in via MockAuthService.signInMock/signUpMock (no network).
 * [AGENTS-W3 W3-C1.5][page contract §6]
 */
export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);

  if (environment.useMockApi) {
    const api = inject(OWNER_API);
    return api.getMockSessionUser() ? true : router.createUrlTree(['/auth/login']);
  }

  const auth = inject(SupabaseAuthService);
  const session = await auth.restoreSession();
  return session ? true : router.createUrlTree(['/auth/login']);
}