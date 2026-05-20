import { Component } from '@angular/core';
import { NavigationEnd, RouterOutlet, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './services/auth.service';
import { I18nService } from './services/i18n.service';
import { CommonModule } from '@angular/common';
import { PublicChatWidgetComponent } from './components/public-chat-widget/public-chat-widget.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, PublicChatWidgetComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = 'AI Hiring Platform';
  sidebarCollapsed = false;
  private readonly publicRoutes = ['/login', '/', '/jobs', '/track', '/withdraw', '/recommendations'];

  constructor(
    public authService: AuthService,
    public i18n: I18nService,
    private router: Router,
  ) {
    this.updateLangScope(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.updateLangScope(event.urlAfterRedirects));
  }

  private updateLangScope(url: string): void {
    this.i18n.setScope(this.isPublicRoute(url) ? 'public' : 'hr');
  }

  /** Show sidebar shell only for authenticated users on non-public routes */
  showShell(): boolean {
    const url = this.router.url;
    if (this.isPublicRoute(url)) {
      return false;
    }
    return this.authService.isLoggedIn();
  }

  private isPublicRoute(url: string): boolean {
    return this.publicRoutes.some(r => url === r || url.startsWith(r + '?') || url.startsWith(r + '/'));
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
