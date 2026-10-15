import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { OWNER_API } from '../services/owner-api.interface';
import { toApiError } from '../services/api-error';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

/**
 * D-OWNER authorization state: reached by ownerGuard when a signed-in non-owner
 * (tenant/admin) tries to open an owner page. Shows a "Become an owner" button that calls
 * POST /api/owner/profile/become-owner, then re-fetches /auth/me. [AGENTS-W3 W3-C1.5, D-OWNER]
 */
export type OwnerRequiredState = 'idle' | 'submitting' | 'error' | 'network';

@Component({
  selector: 'app-owner-required',
  imports: [StateViewComponent, PageHeaderComponent],
  templateUrl: './owner-required.component.html',
})
export class OwnerRequiredComponent {
  private readonly api = inject(OWNER_API);
  private readonly router = inject(Router);

  state: OwnerRequiredState = 'idle';
  errorMessage = '';

  async becomeOwner(): Promise<void> {
    if (this.state === 'submitting') return;
    this.state = 'submitting';
    this.errorMessage = '';

    try {
      const me = await this.api.becomeOwner();
      if (me.is_owner) {
        await this.router.navigate(['/owner/dashboard']);
        return;
      }
      // Server did not grant ownership — stay here with a readable message.
      this.state = 'error';
      this.errorMessage = 'Ownership was not granted. Please try again.';
    } catch (err) {
      const e = toApiError(err);
      this.state = e.kind === 'network' ? 'network' : 'error';
      this.errorMessage = e.message || 'Something went wrong. Please try again.';
    }
  }
}