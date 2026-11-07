import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { OWNER_API } from '../services/owner-api.interface';
import { SupabaseAuthService } from '../services/supabase-auth.service';

/**
 * authGuard — a session must exist, else redirect to /auth/login.
 * Real mode: checks Supabase's persisted session AND that the email is confirmed
 * (D-AUTH-FLOW — an unconfirmed account is redirected back with the ?notice=confirm-email
 * flag so the auth page can show "Please confirm your email" instead of a bare login form).
 * Mock mode (D-MOCK): checks whether a fixture user has signed in via
 * MockAuthService.signInMock/signUpMock (no network).
 * [AGENTS-W3 W3-C1.5][AGENTS-W4 D-AUTH-FLOW][page contract §6]
 */
export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);

  if (environment.useMockApi) {
    const api = inject(OWNER_API);
    return api.getMockSessionUser() ? true : router.createUrlTree(['/auth/login']);
  }

  const auth = inject(SupabaseAuthService);

  try {
    const session = await auth.restoreSession();

    if (!session) {
      return router.createUrlTree(['/auth/login']);
    }

    if (!auth.isEmailConfirmed(session)) {
      // Notification, not a silent redirect: the auth page reads this query param.
      return router.createUrlTree(['/auth/login'], { queryParams: { notice: 'confirm-email' } });
    }

    return true;
  } catch {
    // Supabase not configured yet (placeholders in environment.ts) or unreachable during
    // SSR. Failing the navigation would render a blank page, so send the user to the form.
    return router.createUrlTree(['/auth/login']);
  }
};
