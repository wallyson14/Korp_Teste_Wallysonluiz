import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <div class="app-layout">
      <app-header></app-header>
      <main class="app-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .app-layout {
        display: flex;
        min-height: 100vh;
      }

      .app-main {
        margin-left: 220px;
        flex: 1;
        background: #f8fafc;
        min-height: 100vh;
      }
    `,
  ],
})
export class AppComponent {}