import { Component, input } from '@angular/core';

@Component({
  selector: 'app-rating-stars',
  template: `
    <div class="flex items-center gap-0.5">
      @for (star of [1,2,3,4,5]; track star) {
        <span [class.text-warning]="star <= value()"
              [class.text-gray-300]="star > value()">★</span>
      }
    </div>
  `,
})
export class RatingStarsComponent {
  readonly value = input.required<number>();
}
