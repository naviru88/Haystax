import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./overview/overview.component').then(m => m.OverviewComponent),
        pathMatch: 'full',
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./reports/reports.component').then(m => m.ReportsComponent),
      },
      {
        path: 'moderation',
        loadComponent: () =>
          import('./moderation/moderation.component').then(m => m.ModerationComponent),
      },
      {
        path: 'broadcasts',
        loadComponent: () =>
          import('./broadcasts/broadcasts.component').then(m => m.BroadcastsComponent),
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./audit/audit.component').then(m => m.AuditComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./users/users.component').then(m => m.UsersComponent),
      },
    ],
  },
];
