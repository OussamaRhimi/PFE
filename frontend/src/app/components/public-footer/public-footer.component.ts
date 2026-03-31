import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand">
            <img src="assets/logo/iovision-logo.png" alt="IoHire" class="footer-logo" />
            <span class="footer-name">IoHire</span>
          </div>
          <nav class="footer-links">
            <a routerLink="/jobs">{{ i18n.t('public.navJobs') }}</a>
            <a routerLink="/login">{{ i18n.t('public.login') }}</a>
          </nav>
        </div>
        <div class="footer-divider"></div>
        <div class="footer-bottom">
          <p>&copy; {{ currentYear }} IoHire &mdash; {{ i18n.t('public.footer') }}</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    $logo-red: #8b1f1f;
    $logo-red-deep: #791212;
    $gray-200: #e5e8ef;
    $gray-300: #cbd0dc;
    $gray-400: #9aa0b4;
    $gray-600: #5a6278;
    $gray-800: #252b3b;
    $gray-900: #1a1f2e;

    :host { display: block; margin-top: auto; }

    .footer {
      background: rgba(255, 255, 255, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top: 1px solid rgba(255, 255, 255, 0.4);
      position: relative;
      z-index: 10;
    }
    .footer-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 24px 24px;
    }
    .footer-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .footer-logo {
      height: 28px;
    }
    .footer-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: $gray-800;
    }
    .footer-links {
      display: flex;
      gap: 24px;
    }
    .footer-links a {
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      color: $gray-600;
      transition: color 0.2s;
    }
    .footer-links a:hover { color: $logo-red; }

    .footer-divider {
      height: 1px;
      background: $gray-200;
      margin: 20px 0 16px;
    }
    .footer-bottom {
      text-align: center;
    }
    .footer-bottom p {
      font-size: 13px;
      color: $gray-400;
      margin: 0;
    }

    @media (max-width: 640px) {
      .footer-top {
        flex-direction: column;
        gap: 16px;
        text-align: center;
      }
      .footer-inner { padding: 24px 16px 20px; }
    }
  `],
})
export class PublicFooterComponent {
  currentYear = new Date().getFullYear();
  constructor(public i18n: I18nService) {}
}
