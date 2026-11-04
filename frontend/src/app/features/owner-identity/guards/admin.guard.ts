import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { OWNER_API } from '../services/owner-api.interface';
import { toApiError } from '../services/api-error';

/**
 * adminGuard — authenticated AND is_admin=true, else redirect:
 *   - anonymous      → /auth/login
 *   - non-admin      → /discover (the app's home for tenants and owners)
 *   - 401 from /auth/me → /auth/login
 *
 * The backend still enforces every /api/admin/** call; this guard only stops the admin
 * UI from rendering for the wrong role. Role comes from the server. [AGENTS §0 rule 5]
 */
export const adminGuard: CanActivateFn = async () => {
  const api = inject(OWNER_API);
  const router = inject(Router);

  if (environment.useMockApi && !api.getMockSessionUser()) {
    return router.createUrlTree(['/auth/login']);
  }

  try {
    const me = await api.getMe();
    return me.is_admin ? true : router.createUrlTree(['/discover']);
  } catch (e) {
    const err = toApiError(e);
    if (err.status === 401 || err.kind === 'auth') {
      return router.createUrlTree(['/auth/login']);
    }
    // Network/other: don't render an admin shell we could not authorize.
    return router.createUrlTree(['/discover']);
  }
};
