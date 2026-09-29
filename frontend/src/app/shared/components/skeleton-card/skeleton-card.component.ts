import { Component } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  template: `
    <div class="card animate-pulse">
      <div class="aspect-video bg-gray-200 rounded-lg mb-4"></div>
      <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div class="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
      <div class="flex items-center justify-between">
        <div class="h-5 bg-gray-200 rounded w-24"></div>
        <div class="h-5 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  `,
})
export class SkeletonCardComponent {}
