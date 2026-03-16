import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CandidateService, TrackResponse } from '../../services/candidate.service';
import { I18nService } from '../../services/i18n.service';
import { PublicNavbarComponent } from '../../components/public-navbar/public-navbar.component';
import { PublicFooterComponent } from '../../components/public-footer/public-footer.component';

@Component({
  selector: 'app-withdraw',
  standalone: true,
  imports: [CommonModule, RouterModule, PublicNavbarComponent, PublicFooterComponent],
  template: `
    <app-public-navbar />

    <main class="withdraw-page">
      <p class="center" *ngIf="loading">{{ i18n.t('withdraw.loading') }}</p>

      <div class="alert error" *ngIf="error && !loading && !deleted">
        {{ error }}
        <a routerLink="/track" class="link">{{ i18n.t('withdraw.goTrack') }}</a>
      </div>

      <!-- ── Confirm card ── -->
      <div class="confirm-card" *ngIf="candidate && !deleted && !loading">
        <div class="warn-icon">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        <h1>{{ i18n.t('withdraw.title') }}</h1>
        <p class="subtitle">{{ i18n.t('withdraw.subtitle') }}</p>

        <div class="info-box">
          <div class="info-row">
            <span class="label">{{ i18n.t('withdraw.jobLabel') }}</span>
            <span class="value">{{ candidate.jobTitle }}</span>
          </div>
          <div class="info-row">
            <span class="label">{{ i18n.t('withdraw.statusLabel') }}</span>
            <span class="value">{{ i18n.t('track.status_' + candidate.status) }}</span>
          </div>
          <div class="info-row">
            <span class="label">{{ i18n.t('withdraw.appliedLabel') }}</span>
            <span class="value">{{ candidate.createdAt | date:'longDate' }}</span>
          </div>
        </div>

        <div class="warn-list">
          <p>{{ i18n.t('withdraw.consequences') }}</p>
          <ul>
            <li>{{ i18n.t('withdraw.consequence1') }}</li>
            <li>{{ i18n.t('withdraw.consequence2') }}</li>
            <li>{{ i18n.t('withdraw.consequence3') }}</li>
          </ul>
        </div>

        <div class="actions">
          <button class="btn-danger" (click)="confirmWithdraw()" [disabled]="deleting">
            {{ deleting ? i18n.t('withdraw.deleting') : i18n.t('withdraw.confirm') }}
          </button>
          <a routerLink="/track" [queryParams]="{ token: token }" class="btn-secondary">
            {{ i18n.t('withdraw.cancel') }}
          </a>
        </div>
      </div>

      <!-- ── Deleted success ── -->
      <div class="success-card" *ngIf="deleted">
        <div class="success-icon">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/>
          </svg>
        </div>
        <h2>{{ i18n.t('withdraw.successTitle') }}</h2>
        <p>{{ i18n.t('withdraw.successText') }}</p>
        <a routerLink="/jobs" class="btn-primary">{{ i18n.t('withdraw.backToJobs') }}</a>
      </div>
    </main>

    <app-public-footer />
  `,
  styles: [`
    $logo-red: #8b1f1f;
    $logo-red-deep: #791212;
    $gray-50: #f9fafb;
    $gray-100: #f1f3f7;
    $gray-200: #e5e8ef;
    $gray-400: #9aa0b4;
    $gray-600: #5a6278;
    $gray-700: #3d4358;
    $gray-800: #252b3b;
    $error: #dc2626;
    $success: #16a34a;

    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: $gray-50;
    }

    .withdraw-page {
      flex: 1;
      max-width: 560px;
      margin: 0 auto;
      padding: 48px 24px 64px;
      width: 100%;
    }

    .center { text-align: center; color: $gray-400; padding: 48px 0; }
    .alert.error {
      background: #fef2f2;
      color: $error;
      padding: 16px 20px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .link { color: $logo-red; font-weight: 600; }

    /* ── Confirm card ── */
    .confirm-card {
      background: #fff;
      border: 1px solid $gray-200;
      border-radius: 16px;
      padding: 40px 32px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .warn-icon { margin-bottom: 4px; }
    .confirm-card h1 {
      font-size: 1.35rem;
      font-weight: 800;
      color: $gray-800;
      margin: 0;
    }
    .subtitle {
      color: $gray-600;
      font-size: 14px;
      margin: 0;
    }

    .info-box {
      width: 100%;
      background: $gray-50;
      border: 1px solid $gray-200;
      border-radius: 12px;
      padding: 20px;
      text-align: left;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .info-row + .info-row { border-top: 1px solid $gray-200; }
    .label { font-size: 13px; color: $gray-400; font-weight: 600; }
    .value { font-size: 13px; color: $gray-800; font-weight: 600; }

    .warn-list {
      width: 100%;
      text-align: left;
      padding: 16px 20px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 12px;
    }
    .warn-list p {
      font-size: 13px;
      font-weight: 700;
      color: $error;
      margin: 0 0 8px;
    }
    .warn-list ul {
      margin: 0;
      padding-left: 20px;
    }
    .warn-list li {
      font-size: 13px;
      color: $gray-700;
      line-height: 1.6;
    }

    .actions {
      display: flex;
      gap: 12px;
      padding-top: 8px;
    }
    .btn-danger {
      padding: 12px 28px;
      background: $error;
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s;
    }
    .btn-danger:hover:not(:disabled) {
      background: #b91c1c;
      transform: translateY(-1px);
    }
    .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-secondary {
      padding: 12px 28px;
      background: $gray-100;
      color: $gray-700;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }
    .btn-secondary:hover { background: $gray-200; }

    /* ── Success card ── */
    .success-card {
      background: #fff;
      border: 1px solid $gray-200;
      border-radius: 16px;
      padding: 48px 32px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .success-icon { margin-bottom: 4px; }
    .success-card h2 {
      font-size: 1.3rem;
      font-weight: 800;
      color: $gray-800;
      margin: 0;
    }
    .success-card p {
      font-size: 14px;
      color: $gray-600;
      margin: 0;
    }
    .btn-primary {
      display: inline-block;
      padding: 12px 28px;
      background: linear-gradient(135deg, $logo-red-deep, $logo-red);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      margin-top: 8px;
    }

    @media (max-width: 640px) {
      .confirm-card, .success-card { padding: 28px 20px; }
    }
  `],
})
export class WithdrawComponent implements OnInit {
  token = '';
  loading = true;
  deleting = false;
  deleted = false;
  error = '';
  candidate: TrackResponse | null = null;

  constructor(
    private candidateService: CandidateService,
    public i18n: I18nService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.error = this.i18n.t('withdraw.noToken');
      this.loading = false;
      return;
    }
    // Fetch candidate info first so we can show what's about to be deleted
    this.candidateService.track(this.token).subscribe({
      next: (res) => {
        this.candidate = res;
        this.loading = false;
      },
      error: () => {
        this.error = this.i18n.t('withdraw.notFound');
        this.loading = false;
      },
    });
  }

  confirmWithdraw(): void {
    this.deleting = true;
    this.candidateService.withdraw(this.token).subscribe({
      next: () => {
        this.deleted = true;
        this.deleting = false;
      },
      error: (err) => {
        this.error = err.error?.error?.message || this.i18n.t('withdraw.error');
        this.deleting = false;
      },
    });
  }
}
