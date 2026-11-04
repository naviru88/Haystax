import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { OWNER_API } from '../services/owner-api.interface';
import { SupabaseAuthService } from '../services/supabase-auth.service';
import { OwnerUser } from '../models/owner-user.model';

/**
 * guestGuard — the mirror image of authGuard: keeps an already-signed-in user OFF the
 * login/register page. Put it on /auth/login and nowhere else; the two guards have
 * opposite conditions, which is what makes a redirect loop impossible.
 *
 *   anonymous                → allowed to see the auth page
 *   signed in, unresolved    → allowed (never trap the user behind a backend outage)
 *   signed in, role resolved → bounced to that role's landing page
 *   suspended                → allowed (the auth page renders the suspended state)
 *
 * Role comes from GET /api/owner/auth/me, never from the token. [AGENTS §0 rule 5]
 */
export const guestGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const api = inject(OWNER_API);

  if (environment.useMockApi) {
    // Mock mode has no persisted session: a fixture user must be explicitly signed in.
    if (!api.getMockSessionUser()) return true;
    try {
      return landingFor(await api.getMe(), router);
    } catch {
      return true;
    }
  }

  const auth = inject(SupabaseAuthService);

  // No session, or an unconfirmed one: stay put. The auth page shows the
  // "confirm your email" banner for that case instead of a redirect [D-AUTH-FLOW].
  let session;
  try {
    session = await auth.restoreSession();
  } catch {
    return true;   // Supabase not configured / unreachable — show the form, don't loop
  }
  if (!session || !auth.isEmailConfirmed(session)) return true;

  try {
    return landingFor(await api.getMe(), router);
  } catch {
    // Backend unreachable — let the user see the form rather than bounce them.
    return true;
  }
};

/** Single source of truth for "where does this role land after signing in". */
function landingFor(me: OwnerUser, router: Router): boolean | UrlTree {
  if (me.is_suspended) return true;                        // auth page renders the suspended state
  if (me.is_admin) return router.createUrlTree(['/admin']);
  if (me.is_owner) return router.createUrlTree(['/owner/dashboard']);
  return router.createUrlTree(['/discover']);
}
