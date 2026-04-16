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
     /* Dashboard Container */
.dashboard-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
}

/* Welcome Card */
.welcome-card {
    background: linear-gradient(135deg, #ffffff 0%, #fef9f9 100%);
    border-radius: 20px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(139, 0, 0, 0.1);
    position: relative;
    overflow: hidden;
}

.welcome-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #8B0000, #d42020, #8B0000);
}

.welcome-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.welcome-icon {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #8B0000, #a01010);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
}

.welcome-icon svg {
    width: 28px;
    height: 28px;
}

.welcome-header h2 {
    font-size: 1.8rem;
    font-weight: 600;
    color: #2c2c2c;
    margin: 0 0 0.25rem 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.welcome-header .subtitle {
    color: #666;
    margin: 0;
    font-size: 0.9rem;
}

.user-details {
    background: #f8f8f8;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    border-left: 3px solid #8B0000;
}

.user-details p {
    margin: 0;
    color: #333;
    font-size: 0.95rem;
}

.user-details strong {
    color: #8B0000;
    font-weight: 600;
}

/* Analytics Section */
.analytics-section {
    background: white;
    border-radius: 20px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
    border: 1px solid #f0f0f0;
}

.section-header {
    margin-bottom: 2rem;
}

.section-header h3 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #2c2c2c;
    margin: 0 0 0.5rem 0;
}

.section-subtitle {
    color: #666;
    margin: 0;
    font-size: 0.9rem;
}

/* Stats Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2.5rem;
}

.stat-card {
    background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
    border-radius: 16px;
    padding: 1.5rem;
    text-align: center;
    border: 1px solid #f0f0f0;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.stat-card::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #8B0000, #d42020);
    transform: scaleX(0);
    transition: transform 0.3s ease;
}

.stat-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(139, 0, 0, 0.1);
}

.stat-card:hover::after {
    transform: scaleX(1);
}

.stat-label {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #8B0000;
    font-weight: 600;
    margin-bottom: 0.75rem;
}

.stat-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: #2c2c2c;
    line-height: 1;
}

/* Charts Grid */
.charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
    margin-top: 1rem;
}

.chart-card {
    background: #fafafa;
    border-radius: 16px;
    padding: 1.5rem;
    border: 1px solid #f0f0f0;
    transition: all 0.3s ease;
}

.chart-card:hover {
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
}

.chart-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #2c2c2c;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #8B0000;
    display: inline-block;
}

/* Bar Chart Styles */
.bar-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    font-size: 0.9rem;
}

.bar-label {
    width: 120px;
    color: #555;
    font-weight: 500;
}

.bar-track {
    flex: 1;
    height: 32px;
    background: #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
}

.bar-track span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #8B0000, #d42020);
    border-radius: 8px;
    transition: width 0.5s ease;
    position: relative;
    overflow: hidden;
}

.bar-track span::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, rgba(255,255,255,0.2), transparent);
    animation: shimmer 2s infinite;
}

@keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

.bar-value {
    min-width: 40px;
    text-align: right;
    color: #8B0000;
    font-weight: 600;
}

/* Alert Messages */
.alert {
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1rem;
    background: #f8f8f8;
    color: #666;
    text-align: center;
}

.alert.error {
    background: #ffe4e4;
    color: #8B0000;
    border-left: 4px solid #8B0000;
}

/* Features Section */
.features-section {
    margin-top: 1rem;
}

.features-section h3 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #2c2c2c;
    margin-bottom: 1.5rem;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
}

.feature-card {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    text-decoration: none;
    transition: all 0.3s ease;
    border: 1px solid #f0f0f0;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
}

.feature-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #8B0000, #d42020);
    transform: scaleX(0);
    transition: transform 0.3s ease;
}

.feature-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 15px 35px rgba(139, 0, 0, 0.15);
    border-color: rgba(139, 0, 0, 0.2);
}

.feature-card:hover::before {
    transform: scaleX(1);
}

.card-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    transition: all 0.3s ease;
}

.card-icon.skills {
    background: linear-gradient(135deg, #8B0000, #a01010);
    color: white;
    box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
}

.card-icon.departments {
    background: linear-gradient(135deg, #2c2c2c, #1a1a1a);
    color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.card-icon.jobs {
    background: linear-gradient(135deg, #8B0000, #a01010);
    color: white;
    box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
}

.feature-card:hover .card-icon {
    transform: scale(1.05);
}

.feature-card h4 {
    font-size: 1.2rem;
    font-weight: 600;
    color: #2c2c2c;
    margin: 0 0 0.5rem 0;
}

.feature-card p {
    color: #666;
    font-size: 0.9rem;
    line-height: 1.5;
    margin: 0 0 1rem 0;
    flex: 1;
}

.card-arrow {
    color: #8B0000;
    font-size: 1.2rem;
    font-weight: 600;
    align-self: flex-end;
    transition: transform 0.3s ease;
}

.feature-card:hover .card-arrow {
    transform: translateX(5px);
}

/* Responsive Design */
@media (max-width: 768px) {
    .dashboard-container {
        padding: 1rem;
    }
    
    .welcome-card {
        padding: 1.5rem;
    }
    
    .welcome-header {
        flex-direction: column;
        text-align: center;
    }
    
    .welcome-header h2 {
        font-size: 1.5rem;
    }
    
    .user-details {
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    
    .charts-grid {
        grid-template-columns: 1fr;
    }
    
    .features-grid {
        grid-template-columns: 1fr;
    }
    
    .bar-label {
        width: 90px;
        font-size: 0.8rem;
    }
    
    .stat-value {
        font-size: 2rem;
    }
}

/* Tablet Responsive */
@media (min-width: 769px) and (max-width: 1024px) {
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .charts-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .features-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* Loading States */
.loading {
    text-align: center;
    padding: 2rem;
    color: #8B0000;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}

::-webkit-scrollbar-thumb {
    background: #8B0000;
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: #6d0000;
}

/* Animations */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.stat-card, .feature-card, .chart-card {
    animation: fadeInUp 0.5s ease backwards;
}

.stat-card:nth-child(1) { animation-delay: 0.1s; }
.stat-card:nth-child(2) { animation-delay: 0.2s; }
.stat-card:nth-child(3) { animation-delay: 0.3s; }

.feature-card:nth-child(1) { animation-delay: 0.1s; }
.feature-card:nth-child(2) { animation-delay: 0.2s; }
.feature-card:nth-child(3) { animation-delay: 0.3s; }

/* Print Styles */
@media print {
    .dashboard-container {
        background: white;
        padding: 0;
    }
    
    .feature-card, .stat-card {
        break-inside: avoid;
        box-shadow: none;
        border: 1px solid #ddd;
    }
    
    .card-arrow {
        display: none;
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