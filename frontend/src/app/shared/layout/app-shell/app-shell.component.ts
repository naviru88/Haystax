import { Component, effect, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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

interface NavItem {
  label: string;
  route: string;
  icon: string;
  capability: 'public' | 'owner' | 'admin' | 'tenant';
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
  // Placeholder until Member 2's JWT adapter lands in Week 4
  readonly currentUser = signal({
    displayName: 'Guest',
    isOwner: false,
    isAdmin: true,
    isTenant: true,
  });

  readonly navItems: NavItem[] = [
    { label: 'Home',            route: '/',                     icon: 'heroHome',                capability: 'public' },
    { label: 'Owner Dashboard', route: '/owner',                icon: 'heroBuildingOffice2',     capability: 'owner' },
    { label: 'Add Listing',     route: '/owner/listings/new',   icon: 'heroPlusCircle',          capability: 'owner' },
    { label: 'Messages',        route: '/messages',             icon: 'heroChatBubbleLeftRight', capability: 'tenant' },
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
