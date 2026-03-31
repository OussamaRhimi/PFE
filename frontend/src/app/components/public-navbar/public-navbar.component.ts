import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-public-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="pub-header">
      <div class="pub-header-inner">
        <a routerLink="/home-page" class="brand">
          <img src="assets/logo/iovision-logo.png" alt="IoHire" class="brand-logo" />
          <span class="brand-name">IoHire</span>
        </a>
        <div class="header-actions">
          <a routerLink="/jobs" class="nav-link" routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: true }">{{ i18n.t('public.navJobs') }}</a>
          <a routerLink="/track" class="nav-link" routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: true }">{{ i18n.t('public.trackApp') }}</a>
          <div class="lang-toggle" (click)="i18n.toggle()" [class.en]="i18n.lang === 'en'">
            <span class="lang-label" [class.active]="i18n.lang === 'fr'">FR</span>
            <span class="lang-slider"></span>
            <span class="lang-label" [class.active]="i18n.lang === 'en'">EN</span>
          </div>
          <a routerLink="/login" class="btn-login">{{ i18n.t('public.login') }}</a>
        </div>
      </div>
    </header>
  `,
  styles: [`
    $logo-red: #8b1f1f;
    $logo-red-mid: #a31a1a;
    $logo-red-deep: #791212;
    $gray-50: #f9fafb;
    $gray-100: #f1f3f7;
    $gray-200: #e5e8ef;
    $gray-400: #9aa0b4;
    $gray-600: #5a6278;
    $gray-800: #252b3b;

    :host { display: block; }

    .pub-header {
      background: rgba(255, 255, 255, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.4);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .pub-header-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 24px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }
    .brand-logo { height: 32px; }
    .brand-name {
      font-size: 1.25rem;
      font-weight: 800;
      color: $gray-800;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .nav-link {
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      color: $gray-600;
      transition: color 0.2s;
      padding: 4px 0;
      border-bottom: 2px solid transparent;
    }
    .nav-link:hover { color: $logo-red; }
    .nav-link.active {
      color: $logo-red;
      border-bottom-color: $logo-red;
    }
    .btn-login {
      text-decoration: none;
      padding: 8px 20px;
      border-radius: 10px;
      background: linear-gradient(135deg, $logo-red-deep, $logo-red);
      color: #fff;
      font-size: 13.5px;
      font-weight: 600;
      transition: all 0.25s;
    }
    .btn-login:hover {
      background: linear-gradient(135deg, $logo-red-mid, $logo-red-deep);
      transform: translateY(-1px);
    }

    /* ── Lang toggle ── */
    .lang-toggle {
      display: inline-flex;
      align-items: center;
      background: $gray-100;
      border-radius: 20px;
      padding: 4px 6px;
      cursor: pointer;
      gap: 4px;
      user-select: none;
    }
    .lang-label {
      font-size: 12px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      color: $gray-400;
      transition: color 0.2s;
      z-index: 1;
    }
    .lang-label.active {
      color: $logo-red;
    }

    @media (max-width: 640px) {
      .pub-header-inner { padding: 12px 16px; }
      .nav-link { display: none; }
      .header-actions { gap: 12px; }
    }
  `],
})
export class PublicNavbarComponent {
  constructor(public i18n: I18nService) { }
}
