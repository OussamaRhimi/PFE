import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="footer page-footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand">
            <img src="assets/logo/iovision-logo.png" alt="IoHire" class="footer-logo" />
            <span class="footer-name">IoHire</span>
          </div>
          <nav class="footer-links">
            <a routerLink="/jobs">{{ i18n.t('public.navJobs') }}</a>
            <a routerLink="/recommendations">{{ i18n.t('public.navRecommend') }}</a>
            <a routerLink="/track">{{ i18n.t('public.trackApp') }}</a>
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
    $gray-800: #252b3b;
    $gray-900: #1a1f2e;

    :host { display: block; margin-top: auto; }

    .footer {
      background: $gray-800;
      color: $gray-300;
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
      filter: brightness(0) invert(1);
      opacity: 0.8;
    }
    .footer-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
      opacity: 0.9;
    }
    .footer-links {
      display: flex;
      gap: 24px;
    }
    .footer-links a {
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      color: $gray-300;
      transition: color 0.2s;
    }
    .footer-links a:hover { color: #fff; }

    .footer-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
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
