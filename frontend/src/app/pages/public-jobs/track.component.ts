import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  CandidateService,
  TrackingApplication,
} from '../../services/candidate.service';
import { I18nService } from '../../services/i18n.service';
import { PublicNavbarComponent } from '../../components/public-navbar/public-navbar.component';
import { PublicFooterComponent } from '../../components/public-footer/public-footer.component';

type TrackStep = 'email' | 'code' | 'list';

@Component({
  selector: 'app-track',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PublicNavbarComponent, PublicFooterComponent],
  template: `
    <app-public-navbar />

    <main class="track-page">
      <header class="page-header">
        <h1>{{ i18n.t('track.title') }}</h1>
        <p>{{ i18n.t('track.subtitle') }}</p>
      </header>

      <div class="stepper" aria-label="Tracking flow steps">
        <div class="step" [class.active]="step === 'email'" [class.done]="step !== 'email'">1</div>
        <span class="line" [class.done]="step === 'code' || step === 'list'"></span>
        <div class="step" [class.active]="step === 'code'" [class.done]="step === 'list'">2</div>
        <span class="line" [class.done]="step === 'list'"></span>
        <div class="step" [class.active]="step === 'list'">3</div>
      </div>

      <div class="alert error" *ngIf="error">{{ error }}</div>
      <div class="alert info" *ngIf="info">{{ info }}</div>

      <section class="card" *ngIf="step === 'email'">
        <h2>{{ i18n.t('track.stepEmailTitle') }}</h2>
        <p>{{ i18n.t('track.stepEmailText') }}</p>

        <form (ngSubmit)="sendCode()" class="form-grid">
          <input
            type="email"
            [(ngModel)]="email"
            name="email"
            [placeholder]="i18n.t('track.emailPh')"
            required
          />
          <button type="submit" class="btn-primary" [disabled]="loading || !isValidEmail()">
            {{ loading ? i18n.t('track.sendingCode') : i18n.t('track.sendCode') }}
          </button>
        </form>
      </section>

      <section class="card" *ngIf="step === 'code'">
        <h2>{{ i18n.t('track.stepCodeTitle') }}</h2>
        <p>{{ i18n.t('track.stepCodeText') }}</p>

        <form (ngSubmit)="verifyCode()" class="form-grid">
          <input
            type="text"
            inputmode="numeric"
            maxlength="6"
            [(ngModel)]="code"
            name="code"
            [placeholder]="i18n.t('track.codePh')"
            required
          />
          <button type="submit" class="btn-primary" [disabled]="loading || !isValidCode()">
            {{ loading ? i18n.t('track.verifying') : i18n.t('track.verifyCode') }}
          </button>
        </form>

        <div class="inline-actions">
          <button type="button" class="btn-secondary" (click)="backToEmail()">
            {{ i18n.t('track.changeEmail') }}
          </button>
          <button type="button" class="btn-secondary" (click)="sendCode()" [disabled]="loading">
            {{ i18n.t('track.resendCode') }}
          </button>
        </div>
      </section>

      <section class="card" *ngIf="step === 'list'">
        <div class="card-head">
          <h2>{{ i18n.t('track.stepListTitle') }}</h2>
          <button type="button" class="btn-secondary" (click)="restart()">
            {{ i18n.t('track.newSearch') }}
          </button>
        </div>

        <p class="muted">
          {{ i18n.t('track.resultsFor') }} <strong>{{ verifiedEmail }}</strong>
        </p>

        <div class="applications" *ngIf="applications.length > 0; else emptyState">
          <article class="application" *ngFor="let app of applications">
            <div class="application-row">
              <div class="application-header">
                <h3>{{ app.jobTitle || i18n.t('track.unknownJob') }}</h3>
                <span class="status-badge" [attr.data-status]="app.status">
                  {{ i18n.t('track.status_' + app.status) }}
                </span>
              </div>
              
              <!-- AI Score Display -->
              <div class="score-display" *ngIf="app.status === 'processed'">
                <svg class="score-circle" viewBox="0 0 100 100">
                  <circle class="score-bg" cx="50" cy="50" r="45"/>
                  <circle 
                    class="score-progress" 
                    cx="50" cy="50" r="45"
                    [attr.data-quality]="app.qualityLabel"
                    [style.strokeDasharray]="'283.6 283.6'"
                    [style.strokeDashoffset]="283.6 - (app.score / 100) * 283.6"
                  />
                </svg>
                <div class="score-content">
                  <div class="score-value">{{ app.score }}</div>
                  <div class="score-label" [attr.data-quality]="app.qualityLabel">
                    {{ app.qualityLabel | uppercase }}
                  </div>
                </div>
              </div>
            </div>

            <div class="meta">
              <span>{{ i18n.t('track.appliedAt') }}: {{ app.createdAt | date:'longDate' }}</span>
              <span>{{ i18n.t('track.retentionUntil') }}: {{ app.retentionUntil | date:'longDate' }}</span>
            </div>

            <div class="application-actions">
              <a
                *ngIf="app.status === 'processed'"
                [href]="candidateService.getCvPdfDownloadUrl(app.documentId, app.publicToken)"
                target="_blank"
                rel="noopener"
                class="btn-secondary">
                {{ i18n.t('track.downloadCv') || 'Download CV' }}
              </a>
              <a [routerLink]="['/withdraw', app.publicToken]" class="btn-danger">
                {{ i18n.t('track.withdraw') }}
              </a>
            </div>
          </article>
        </div>

        <ng-template #emptyState>
          <div class="empty">{{ i18n.t('track.emptyList') }}</div>
        </ng-template>
      </section>
    </main>

    <app-public-footer />
  `,
  styles: [`
    $logo-red: #8b1f1f;
    $logo-red-deep: #791212;
    $gray-50: #f9fafb;
    $gray-100: #f1f3f7;
    $gray-200: #e5e8ef;
    $gray-300: #cbd0dc;
    $gray-400: #9aa0b4;
    $gray-600: #5a6278;
    $gray-700: #3d4358;
    $gray-800: #252b3b;
    $error: #dc2626;
    $success: #16a34a;
    $amber: #d97706;

    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: radial-gradient(circle at top right, #ffffff 0%, #f9fafb 45%, #eef1f7 100%);
    }

    .track-page {
      flex: 1;
      width: 100%;
      max-width: 760px;
      margin: 0 auto;
      padding: 44px 24px 64px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .page-header h1 {
      margin: 0;
      font-size: 1.8rem;
      color: $gray-800;
      font-weight: 800;
    }

    .page-header p {
      margin: 8px 0 0;
      color: $gray-600;
    }

    .stepper {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 2px;
    }

    .step {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      border: 1px solid $gray-300;
      color: $gray-400;
      font-weight: 700;
      background: #fff;
    }

    .step.active {
      border-color: $logo-red;
      color: #fff;
      background: linear-gradient(135deg, $logo-red-deep, $logo-red);
    }

    .step.done {
      border-color: #b7dfc6;
      color: #0f5132;
      background: #dcfce7;
    }

    .line {
      flex: 1;
      height: 3px;
      border-radius: 999px;
      background: $gray-200;
    }

    .line.done {
      background: linear-gradient(90deg, #16a34a, #22c55e);
    }

    .card {
      background: #fff;
      border: 1px solid $gray-200;
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 8px 26px rgba(24, 39, 75, 0.05);
    }

    .card h2 {
      margin: 0 0 8px;
      font-size: 1.2rem;
      font-weight: 800;
      color: $gray-800;
    }

    .card p {
      margin: 0;
      color: $gray-600;
    }

    .form-grid {
      margin-top: 18px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
    }

    input {
      width: 100%;
      padding: 12px 14px;
      border: 1.5px solid $gray-200;
      border-radius: 12px;
      font-size: 14px;
    }

    input:focus {
      outline: none;
      border-color: $logo-red;
      box-shadow: 0 0 0 4px rgba(139, 31, 31, 0.08);
    }

    .btn-primary {
      border: none;
      padding: 12px 18px;
      border-radius: 12px;
      background: linear-gradient(135deg, $logo-red-deep, $logo-red);
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      border: 1px solid $gray-200;
      padding: 10px 14px;
      border-radius: 10px;
      background: $gray-100;
      color: $gray-700;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }

    .inline-actions {
      margin-top: 14px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .alert {
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 14px;
    }

    .alert.error {
      background: #fef2f2;
      color: $error;
      border: 1px solid #fecaca;
    }

    .alert.info {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }

    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }

    .muted {
      margin-top: 10px;
      font-size: 13px;
      color: $gray-600;
    }

    .applications {
      margin-top: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .application {
      border: 1px solid $gray-200;
      border-radius: 14px;
      padding: 16px;
      background: linear-gradient(180deg, #fff 0%, #fcfcfd 100%);
    }

    .application-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .application-row h3 {
      margin: 0;
      font-size: 1rem;
      color: $gray-800;
      font-weight: 700;
    }

    .meta {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: $gray-600;
      font-size: 13px;
    }

    .application-actions {
      margin-top: 14px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn-danger {
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid #fecaca;
      background: #fef2f2;
      color: $error;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
    }

    .status-badge {
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }

    .status-badge[data-status="new"]         { background: #fef3c7; color: $amber; }
    .status-badge[data-status="processing"]  { background: #e0f2fe; color: #0369a1; }
    .status-badge[data-status="processed"]   { background: #dbeafe; color: #2563eb; }
    .status-badge[data-status="reviewing"]   { background: #e0e7ff; color: #4338ca; }
    .status-badge[data-status="shortlisted"] { background: #fae8ff; color: #a21caf; }
    .status-badge[data-status="hired"]       { background: #dcfce7; color: $success; }
    .status-badge[data-status="rejected"]    { background: #fef2f2; color: $error; }
    .status-badge[data-status="error"]       { background: #fef2f2; color: $error; }

    /* ─ Score Display ─ */
    .application-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      width: 100%;
    }

    .score-display {
      position: relative;
      width: 90px;
      height: 90px;
      flex-shrink: 0;
    }

    .score-circle {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .score-bg {
      fill: none;
      stroke: $gray-100;
      stroke-width: 4;
    }

    .score-progress {
      fill: none;
      stroke-width: 4;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.6s ease;
    }

    .score-progress[data-quality="excellent"] {
      stroke: #10b981;
    }

    .score-progress[data-quality="good"] {
      stroke: #3b82f6;
    }

    .score-progress[data-quality="fair"] {
      stroke: #f59e0b;
    }

    .score-progress[data-quality="poor"] {
      stroke: #ef4444;
    }

    .score-content {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
    }

    .score-value {
      font-size: 22px;
      font-weight: 800;
      color: $gray-800;
      line-height: 1;
    }

    .score-label {
      font-size: 10px;
      font-weight: 700;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .score-label[data-quality="excellent"] {
      color: #10b981;
    }

    .score-label[data-quality="good"] {
      color: #3b82f6;
    }

    .score-label[data-quality="fair"] {
      color: #f59e0b;
    }

    .score-label[data-quality="poor"] {
      color: #ef4444;
    }

    .empty {
      margin-top: 16px;
      border: 1px dashed $gray-300;
      border-radius: 12px;
      padding: 14px;
      color: $gray-600;
      text-align: center;
    }

    @media (max-width: 720px) {
      .track-page {
        padding: 32px 16px 52px;
      }

      .card {
        padding: 20px;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .card-head {
        flex-direction: column;
        align-items: flex-start;
      }

      .application-row {
        flex-direction: column;
        align-items: flex-start;
      }

      .application-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .score-display {
        width: 80px;
        height: 80px;
        align-self: flex-end;
        margin-top: 10px;
      }

      .score-value {
        font-size: 18px;
      }
    }
  `],
})
export class TrackComponent implements OnInit {
  step: TrackStep = 'email';
  email = '';
  verifiedEmail = '';
  code = '';
  applications: TrackingApplication[] = [];
  loading = false;
  error = '';
  info = '';

  constructor(
    public candidateService: CandidateService,
    public i18n: I18nService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const emailQuery = this.route.snapshot.queryParamMap.get('email');
    if (emailQuery) {
      this.email = emailQuery;
    }
  }

  isValidEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  isValidCode(): boolean {
    return /^\d{6}$/.test(this.code.trim());
  }

  sendCode(): void {
    if (!this.isValidEmail()) return;

    this.loading = true;
    this.error = '';
    this.info = '';

    this.candidateService.requestTrackingCode(this.email.trim()).subscribe({
      next: () => {
        this.step = 'code';
        this.loading = false;
        this.info = this.i18n.t('track.codeSent');
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error?.message || this.i18n.t('track.sendFailed');
      },
    });
  }

  verifyCode(): void {
    if (!this.isValidEmail() || !this.isValidCode()) return;

    this.loading = true;
    this.error = '';
    this.info = '';

    this.candidateService.verifyTrackingCode(this.email.trim(), this.code.trim()).subscribe({
      next: (res) => {
        this.loading = false;
        this.step = 'list';
        this.verifiedEmail = res.email;
        this.applications = res.applications;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error?.message || this.i18n.t('track.invalidCode');
      },
    });
  }

  backToEmail(): void {
    this.step = 'email';
    this.code = '';
    this.error = '';
    this.info = '';
  }

  restart(): void {
    this.step = 'email';
    this.code = '';
    this.error = '';
    this.info = '';
    this.applications = [];
    this.verifiedEmail = '';
  }
}
