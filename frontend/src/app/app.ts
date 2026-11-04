import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root component. Deliberately chrome-free: the app shell (sidebar + topbar) lives on the
 * guarded shell route in app.routes.ts, so /auth/login renders full-screen without the
 * sidebar and every signed-in page renders inside it.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  protected readonly title = 'haystax-frontend';
}
