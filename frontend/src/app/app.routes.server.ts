import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Dynamic routes — render on demand per request, not at build time
  {
    path: 'listings/:id',
    renderMode: RenderMode.Server
  },
  // Prerender static routes (discovery, admin, engagement pages, etc.)
  {
    path: '**',
    renderMode: RenderMode.Server
  }
  { path: 'listings/:id', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Server },
];
