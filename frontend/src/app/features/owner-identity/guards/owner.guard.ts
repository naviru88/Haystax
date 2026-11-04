import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { OWNER_API } from '../services/owner-api.interface';
import { toApiError } from '../services/api-error';

/**
 * ownerGuard — authenticated AND is_owner=true, else redirect:
 *   - anonymous → /auth/login (mock mode: no fixture signed in)
 *   - tenant/admin (is_owner=false, not suspended) → the authorization state ('/owner/required')
 *   - suspended owner → allowed through (can still read; dashboard shows the suspension banner)
 * Roles come from GET /api/owner/auth/me — never from the client / token. [AGENTS-W3 W3-C1.5]
 */
export const ownerGuard: CanActivateFn = async () => {
  const api = inject(OWNER_API);
  const router = inject(Router);

  if (environment.useMockApi && !api.getMockSessionUser()) {
    return router.createUrlTree(['/auth/login']);
  }

  try {
    const me = await api.getMe();
    if (me.is_owner) return true;
    if (me.is_suspended) return true;   // suspended owners may still read [W3-C1.5]
    return router.createUrlTree(['/owner/required']);
  } catch (e) {
    const err = toApiError(e);
    if (err.status === 401 || err.kind === 'auth') {
      return router.createUrlTree(['/auth/login']);
    }
    // Network/other — let the page render its error state (backend stopped etc.).
    return router.createUrlTree(['/owner/dashboard'], { queryParams: { authError: '1' } });
  }
}