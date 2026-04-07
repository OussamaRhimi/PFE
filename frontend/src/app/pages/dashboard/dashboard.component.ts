import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../services/i18n.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AnalyticsService, AnalyticsResponse } from '../../services/analytics.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container">
      <div class="welcome-card">
        <div class="welcome-header">
          <div class="welcome-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <h2>{{ i18n.t('dashboard.welcome') }}</h2>
            <p class="subtitle">{{ i18n.t('dashboard.subtitle') }}</p>
          </div>
        </div>
        <div *ngIf="authService.currentUser$ | async as user" class="user-details">
          <p><strong>{{ i18n.t('dashboard.user') }} :</strong> {{ user.username }}</p>
          <p><strong>{{ i18n.t('dashboard.email') }} :</strong> {{ user.email }}</p>
        </div>
      </div>

      <div class="analytics-section">
        <div class="section-header">
          <div>
            <h3>{{ i18n.t('dashboard.analyticsTitle') }}</h3>
            <p class="section-subtitle">{{ i18n.t('dashboard.analyticsSubtitle') }}</p>
          </div>
        </div>

        <div class="alert" *ngIf="loadingAnalytics">{{ i18n.t('dashboard.analyticsLoading') }}</div>
        <div class="alert error" *ngIf="analyticsError">{{ analyticsError }}</div>
        <div class="alert" *ngIf="!loadingAnalytics && !analytics && !analyticsError">
          {{ i18n.t('dashboard.analyticsEmpty') }}
        </div>

        <div *ngIf="analytics">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">{{ i18n.t('dashboard.totalCandidates') }}</div>
              <div class="stat-value">{{ analytics.totals.candidates }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">{{ i18n.t('dashboard.totalJobs') }}</div>
              <div class="stat-value">{{ analytics.totals.jobs }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">{{ i18n.t('dashboard.totalOpenJobs') }}</div>
              <div class="stat-value">{{ analytics.totals.openJobs }}</div>
            </div>
          </div>

          <div class="charts-grid">
            <div class="chart-card">
              <div class="chart-title">{{ i18n.t('dashboard.statusBreakdown') }}</div>
              <div class="bar-row" *ngFor="let item of statusSeries">
                <span class="bar-label">{{ statusLabel(item.status) }}</span>
                <div class="bar-track">
                  <span [style.width.%]="(item.count / statusMax) * 100"></span>
                </div>
                <span class="bar-value">{{ item.count }}</span>
              </div>
            </div>

            <div class="chart-card">
              <div class="chart-title">{{ i18n.t('dashboard.scoreDistribution') }}</div>
              <div class="bar-row" *ngFor="let item of scoreSeries">
                <span class="bar-label">{{ item.label }}</span>
                <div class="bar-track">
                  <span [style.width.%]="(item.count / scoreMax) * 100"></span>
                </div>
                <span class="bar-value">{{ item.count }}</span>
              </div>
            </div>

            <div class="chart-card">
              <div class="chart-title">{{ i18n.t('dashboard.applicationsOverTime') }}</div>
              <div class="bar-row" *ngFor="let item of monthSeries">
                <span class="bar-label">{{ item.month }}</span>
                <div class="bar-track">
                  <span [style.width.%]="(item.count / monthMax) * 100"></span>
                </div>
                <span class="bar-value">{{ item.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="features-section">
        <h3>{{ i18n.t('dashboard.quickAccess') }}</h3>
        <div class="features-grid">
          <a routerLink="/skills" class="feature-card">
            <div class="card-icon skills">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <h4>{{ i18n.t('dashboard.skillsTitle') }}</h4>
            <p>{{ i18n.t('dashboard.skillsDesc') }}</p>
            <span class="card-arrow">&rarr;</span>
          </a>
          <a routerLink="/departments" class="feature-card">
            <div class="card-icon departments">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <h4>{{ i18n.t('dashboard.deptTitle') }}</h4>
            <p>{{ i18n.t('dashboard.deptDesc') }}</p>
            <span class="card-arrow">&rarr;</span>
          </a>
          <a routerLink="/job-postings" class="feature-card">
            <div class="card-icon jobs">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <h4>{{ i18n.t('dashboard.jobsTitle') }}</h4>
            <p>{{ i18n.t('dashboard.jobsDesc') }}</p>
            <span class="card-arrow">&rarr;</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      $logo-red: #8b1f1f;
      $logo-red-mid: #a31a1a;
      $logo-red-deep: #791212;
      $gray-50: #f9fafb;
      $gray-100: #f1f3f7;
      $gray-200: #e5e8ef;
      $gray-300: #cbd0dc;
      $gray-400: #9aa0b4;
      $gray-600: #5a6278;
      $gray-700: #3d4358;
      $gray-800: #252b3b;

      .dashboard-container {
        padding: 2rem;
        max-width: 1100px;
        margin: 0 auto;
        width: 100%;
      }

      .welcome-card {
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 2rem 2.5rem;
        box-shadow:
          0 4px 24px rgba(0, 0, 0, 0.06),
          0 1px 3px rgba($logo-red, 0.04);
        margin-bottom: 2.5rem;
        border: 1px solid rgba(255, 255, 255, 0.9);
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 32px;
          right: 32px;
          height: 3px;
          background: linear-gradient(90deg, transparent, $logo-red-deep, $logo-red-mid, transparent);
          border-radius: 0 0 4px 4px;
        }

        .welcome-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .welcome-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, $logo-red-deep, $logo-red);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba($logo-red, 0.3);
        }

        h2 {
          color: $gray-800;
          margin: 0;
          font-size: 1.5rem;
          font-weight: 800;
        }

        .subtitle {
          color: $gray-400;
          font-size: 13.5px;
          margin: 4px 0 0;
        }

        .user-details {
          background: $gray-50;
          border-left: 3px solid $logo-red;
          padding: 1rem 1.25rem;
          border-radius: 10px;

          p {
            margin: 0.4rem 0;
            font-size: 14px;
            color: $gray-700;
          }
        }
      }

      .analytics-section {
        margin-bottom: 2.5rem;

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;

          h3 {
            margin: 0 0 4px;
            font-size: 1.05rem;
            font-weight: 700;
            color: $gray-800;
          }
        }

        .section-subtitle {
          margin: 0;
          font-size: 12.5px;
          color: $gray-400;
        }
      }

      .alert {
        background: $gray-50;
        border: 1px solid $gray-200;
        padding: 10px 12px;
        border-radius: 10px;
        font-size: 13px;
        color: $gray-600;
        margin-bottom: 12px;
      }
      .alert.error {
        background: #fff5f5;
        border-color: #fbd5d5;
        color: #b91c1c;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .stat-card {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid $gray-200;
        border-radius: 16px;
        padding: 1.2rem 1.4rem;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      }
      .stat-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: $gray-400;
        margin-bottom: 6px;
      }
      .stat-value {
        font-size: 1.6rem;
        font-weight: 800;
        color: $gray-800;
      }

      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
      }

      .chart-card {
        background: #fff;
        border: 1px solid $gray-200;
        border-radius: 16px;
        padding: 1.2rem 1.4rem;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
      }

      .chart-title {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: $gray-400;
        margin-bottom: 12px;
        font-weight: 700;
      }

      .bar-row {
        display: grid;
        grid-template-columns: minmax(90px, 1fr) 2.5fr auto;
        gap: 10px;
        align-items: center;
        margin-bottom: 10px;
      }
      .bar-label {
        font-size: 12px;
        color: $gray-700;
      }
      .bar-value {
        font-size: 12px;
        color: $gray-600;
        font-weight: 600;
      }
      .bar-track {
        height: 8px;
        background: $gray-100;
        border-radius: 999px;
        overflow: hidden;
      }
      .bar-track span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, $logo-red-deep, $logo-red);
        border-radius: 999px;
      }

      .features-section {
        h3 {
          color: $gray-800;
          margin: 0 0 1.5rem;
          font-size: 1.1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 12.5px;
          color: $gray-400;
        }
      }

      .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
      }

      .feature-card {
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px);
        border-radius: 18px;
        padding: 1.75rem;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
        border: 1px solid $gray-200;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        text-decoration: none;
        display: block;
        position: relative;
        cursor: pointer;

        &:hover {
          box-shadow:
            0 8px 30px rgba($logo-red, 0.1),
            0 2px 8px rgba(0, 0, 0, 0.06);
          transform: translateY(-4px);
          border-color: rgba($logo-red, 0.15);

          .card-arrow {
            opacity: 1;
            transform: translateX(0);
            color: $logo-red;
          }

          .card-icon {
            transform: scale(1.05);
          }
        }

        .card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          transition: transform 0.3s;

          &.skills {
            background: rgba($logo-red, 0.08);
            color: $logo-red;
          }
          &.departments {
            background: rgba(#166534, 0.08);
            color: #166534;
          }
          &.jobs {
            background: rgba(#1e40af, 0.08);
            color: #1e40af;
          }
        }

        h4 {
          color: $gray-800;
          margin: 0 0 0.5rem;
          font-size: 1rem;
          font-weight: 700;
        }

        p {
          color: $gray-400;
          font-size: 13.5px;
          line-height: 1.5;
          margin: 0;
        }

        .card-arrow {
          position: absolute;
          top: 1.75rem;
          right: 1.75rem;
          font-size: 1.25rem;
          color: $gray-300;
          opacity: 0;
          transform: translateX(-6px);
          transition: all 0.3s;
        }
      }

      @media (max-width: 768px) {
        .dashboard-container {
          padding: 1rem;
        }
        .features-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  analytics: AnalyticsResponse | null = null;
  statusSeries: Array<{ status: string; count: number }> = [];
  scoreSeries: Array<{ label: string; count: number }> = [];
  monthSeries: Array<{ month: string; count: number }> = [];
  statusMax = 0;
  scoreMax = 0;
  monthMax = 0;
  loadingAnalytics = false;
  analyticsError = '';

  constructor(
    public authService: AuthService,
    public i18n: I18nService,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  statusLabel(status: string): string {
    const key = `track.status_${status}`;
    const translated = this.i18n.t(key);
    return translated === key ? status : translated;
  }

  private loadAnalytics(): void {
    this.loadingAnalytics = true;
    this.analyticsError = '';

    this.analyticsService.getAnalytics().subscribe({
      next: (res) => {
        this.analytics = res;
        this.statusSeries = Object.entries(res.statusCounts || {})
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count);
        this.scoreSeries = [...(res.scoreBuckets || [])]
          .sort((a, b) => a.min - b.min)
          .map((bucket) => ({ label: bucket.label, count: bucket.count }));
        this.monthSeries = [...(res.monthlyApplications || [])]
          .map((entry) => ({ month: entry.month, count: entry.count }));

        this.statusMax = Math.max(1, ...this.statusSeries.map((s) => s.count));
        this.scoreMax = Math.max(1, ...this.scoreSeries.map((s) => s.count));
        this.monthMax = Math.max(1, ...this.monthSeries.map((s) => s.count));
        this.loadingAnalytics = false;
      },
      error: () => {
        this.analyticsError = this.i18n.t('dashboard.analyticsError');
        this.loadingAnalytics = false;
      },
    });
  }
}