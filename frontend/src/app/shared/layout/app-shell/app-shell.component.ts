import { Component, effect, signal, HostListener, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroHome,
  heroBuildingOffice2,
  heroPlusCircle,
  heroChatBubbleLeftRight,
  heroChartBar,
  heroShieldCheck,
  heroBell,
  heroUserCircle,
  heroBars3,
  heroChevronDoubleLeft,
  heroChevronDoubleRight,
} from '@ng-icons/heroicons/outline';

import { environment } from '../../../../environments/environment';
import { OWNER_API } from '../../../features/owner-identity/services/owner-api.interface';
import { SupabaseAuthService } from '../../../features/owner-identity/services/supabase-auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  capability: 'public' | 'owner' | 'admin' | 'tenant';
}

/** What the topbar shows; derived from GET /api/owner/auth/me, never from the token. */
interface ShellUser {
  displayName: string;
  isOwner: boolean;
  isAdmin: boolean;
  isTenant: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon],
  providers: [
    provideIcons({
      heroHome,
      heroBuildingOffice2,
      heroPlusCircle,
      heroChatBubbleLeftRight,
      heroChartBar,
      heroShieldCheck,
      heroBell,
      heroUserCircle,
      heroBars3,
      heroChevronDoubleLeft,
      heroChevronDoubleRight,
    }),
  ],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent {
  private readonly api = inject(OWNER_API);
  private readonly supabase = inject(SupabaseAuthService);
  private readonly router = inject(Router);

  /**
   * Real roles, resolved once on shell creation. The shell only renders behind authGuard,
   * so a session already exists; if /auth/me fails (backend down, mock quirks) we keep the
   * guest placeholder rather than hiding the whole UI.
   */
  readonly currentUser = signal<ShellUser>({
    displayName: 'Signed in',
    isOwner: false,
    isAdmin: false,
    isTenant: true,
  });

  readonly navItems: NavItem[] = [
    { label: 'Home',            route: '/discover',             icon: 'heroHome',                capability: 'public' },
    { label: 'Owner Dashboard', route: '/owner/dashboard',      icon: 'heroBuildingOffice2',     capability: 'owner' },
    { label: 'Add Listing',     route: '/owner/listings/new',   icon: 'heroPlusCircle',          capability: 'owner' },
    { label: 'Bookings',        route: '/booking',              icon: 'heroHome',                capability: 'tenant' },
    { label: 'Messages',        route: '/messages',             icon: 'heroChatBubbleLeftRight', capability: 'tenant' },
    { label: 'Reviews',         route: '/reviews',              icon: 'heroBuildingOffice2',     capability: 'public' },
    { label: 'Analytics',       route: '/analytics',            icon: 'heroChartBar',            capability: 'owner' },
    { label: 'Admin Panel',     route: '/admin',                icon: 'heroShieldCheck',         capability: 'admin' },
  ];

  // ---------- Sidebar collapse ----------
  private readonly STORAGE_KEY = 'haystax.sidebar.collapsed';

  readonly collapsed = signal<boolean>(this.readCollapsed());

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(this.STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(this.STORAGE_KEY, this.collapsed() ? '1' : '0');
      } catch {
        // ignore quota / private mode errors
      }
    });
    void this.loadCurrentUser();
  }

  /** Roles come from the server; a failure leaves the neutral placeholder in place. */
  private async loadCurrentUser(): Promise<void> {
    try {
      const me = await this.api.getMe();
      this.currentUser.set({
        displayName: me.display_name,
        isOwner: me.is_owner,
        isAdmin: me.is_admin,
        isTenant: !me.is_owner && !me.is_admin,
      });
    } catch {
      // Backend unreachable — the page itself renders the error state.
    }
  }

  /** Sign out, then return to the front door. Required: guestGuard bounces signed-in users away from /auth/login, so without this there is no way back to the form. */
  async signOut(): Promise<void> {
    try {
      if (environment.useMockApi) {
        this.api.switchUser('');          // mock-mode sign-out clears the fixture session
      } else {
        await this.supabase.signOut();
      }
    } catch {
      // ignore — still leave the page
    }
    await this.router.navigate(['/auth/login']);
  }

  toggleSidebar(): void {
    this.collapsed.update(v => !v);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      this.toggleSidebar();
    }
  }

  canSee(item: NavItem): boolean {
    const u = this.currentUser();
    switch (item.capability) {
      case 'public':  return true;
      case 'owner':   return u.isOwner;
      case 'admin':   return u.isAdmin;
      case 'tenant':  return u.isTenant;
    }
  }
}
