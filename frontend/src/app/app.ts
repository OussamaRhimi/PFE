import { Component } from '@angular/core';
import { RouterOutlet, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './services/auth.service';
import { I18nService } from './services/i18n.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = 'AI Hiring Platform';
  sidebarCollapsed = false;

  constructor(
    public authService: AuthService,
    public i18n: I18nService,
    private router: Router,
  ) {}

  /** Show sidebar shell only for authenticated users on non-public routes */
  showShell(): boolean {
    const url = this.router.url;
    const publicRoutes = ['/login', '/', '/jobs', '/track', '/withdraw'];
    if (publicRoutes.some(r => url === r || url.startsWith(r + '?') || url.startsWith(r + '/'))) {
      return false;
    }
    return this.authService.isLoggedIn();
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
