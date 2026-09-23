import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroHome,
  heroMagnifyingGlass,
  heroSparkles,
  heroBuildingOffice2,
  heroPlusCircle,
  heroChatBubbleLeftRight,
  heroStar,
  heroChartBar,
  heroShieldCheck,
  heroBell,
  heroUserCircle,
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
      heroMagnifyingGlass,
      heroSparkles,
      heroBuildingOffice2,
      heroPlusCircle,
      heroChatBubbleLeftRight,
      heroStar,
      heroChartBar,
      heroShieldCheck,
      heroBell,
      heroUserCircle,
    }),
  ],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent {
  // Placeholder until Member 2's JWT adapter lands in Week 4
  readonly currentUser = signal({
    displayName: 'Guest',
    isOwner: false,
    isAdmin: false,
    isTenant: true,
  });

  readonly navItems: NavItem[] = [
    // Member 1 — Public Discovery
    { label: 'Home',            route: '/',                icon: 'heroHome',                capability: 'public' },
    { label: 'Search',          route: '/search',          icon: 'heroMagnifyingGlass',     capability: 'public' },
    { label: 'Recommendations', route: '/recommendations', icon: 'heroSparkles',            capability: 'public' },
    // Member 2 — Owner & Identity
    { label: 'Owner Dashboard', route: '/owner',           icon: 'heroBuildingOffice2',     capability: 'owner' },
    { label: 'Add Listing',     route: '/owner/listings/new', icon: 'heroPlusCircle',       capability: 'owner' },
    // Member 3 — Engagement
    { label: 'Messages',        route: '/messages',        icon: 'heroChatBubbleLeftRight', capability: 'tenant' },
    { label: 'Reviews',         route: '/reviews',         icon: 'heroStar',                capability: 'tenant' },
    { label: 'Analytics',       route: '/analytics',       icon: 'heroChartBar',            capability: 'owner' },
    // Admin
    { label: 'Admin Panel',     route: '/admin',           icon: 'heroShieldCheck',         capability: 'admin' },
  ];

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
