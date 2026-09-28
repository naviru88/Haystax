import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface AdminTab {
  label: string;
  route: string;
  exact: boolean;
}

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.component.html',
})
export class AdminShellComponent {
  readonly tabs: AdminTab[] = [
    { label: 'Overview',   route: '/admin',            exact: true  },
    { label: 'Reports',    route: '/admin/reports',    exact: false },
    { label: 'Moderation', route: '/admin/moderation', exact: false },
    { label: 'Broadcasts', route: '/admin/broadcasts', exact: false },
    { label: 'Audit log',  route: '/admin/audit',      exact: false },
    { label: 'Users',      route: '/admin/users',      exact: false },
  ];
}
