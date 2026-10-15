import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'engagement',
    loadChildren: () => import('./features/engagement/engagement.module').then(m => m.EngagementModule)
  },
  { path: '', redirectTo: 'engagement/booking', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
