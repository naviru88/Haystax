import { Component } from '@angular/core';
import { AppShellComponent } from './shared/layout/app-shell/app-shell.component';

@Component({
  selector: 'app-root',
  imports: [AppShellComponent],
  templateUrl: './app.html',
})
export class App {
  protected readonly title = 'haystax-frontend';
}
