import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { LucideAngularModule } from 'lucide-angular';
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Clock3,
  GitCompareArrows,
  RefreshCw,
  Target,
  Users,
} from 'lucide-angular/src/icons';
import { RevealOnScrollDirective } from '../../components/reveal-on-scroll.directive';
import { CandidateService, AnalyticsCandidate } from '../../services/candidate.service';
import { JobPostingService, JobPosting } from '../../services/job-posting.service';
import { I18nService } from '../../services/i18n.service';

Chart.register(...registerables);

type DayKey = string;

type ThemeVars = {
  text: string;
  muted: string;
  border: string;
  panel2: string;
  accent: string;
  ok: string;
  danger: string;
};

function dayKey(iso: string | null): DayKey | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function safeMsBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return null;
  const ms = db - da;
  return ms >= 0 ? ms : null;
}

function topEntries(counts: Record<string, number>, limit: number) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function inc(counts: Record<string, number>, key: string, n = 1) {
  counts[key] = (counts[key] ?? 0) + n;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RevealOnScrollDirective],
  template: `
    <div class="analytics-page">
      <div class="analytics-head analytics-fade">
        <div>
          <h1>{{ i18n.t('analytics.title') }}</h1>
          <p class="muted">{{ i18n.t('analytics.subtitle') }}</p>
        </div>
        <div class="actions">
          <button class="btn btn--ghost analytics-refresh-btn" type="button" (click)="refresh()" [disabled]="loading">
            <lucide-angular [img]="icons.refresh" [size]="16"></lucide-angular>
            <span>{{ i18n.t('analytics.refresh') }}</span>
          </button>
        </div>
      </div>

      <div class="alert alert--error" *ngIf="error">{{ error }}</div>

      <ng-container *ngIf="loading; else analyticsBody">
        <div class="skeleton" style="height: 42px; width: 100%; margin-top: 12px"></div>
        <div class="skeleton" style="height: 240px; width: 100%; margin-top: 12px"></div>
      </ng-container>

      <ng-template #analyticsBody>
        <div class="analytics-grid analytics-grid--lead">
          <div class="card analytics-kpi-wrap" appRevealOnScroll>
            <div class="header-row">
              <div>
                <div class="strong">{{ i18n.t('analytics.kpi.title') }}</div>
                <div class="muted small">{{ i18n.t('analytics.kpi.lastRefreshed') }} {{ formatDateTime(lastRefreshedAt) }}</div>
              </div>
            </div>

            <div class="analytics-kpi-grid">
              <div class="analytics-kpi">
                <div class="analytics-kpi__icon"><lucide-angular [img]="icons.jobs" [size]="16"></lucide-angular></div>
                <div class="kpi__label">{{ i18n.t('analytics.kpi.openJobs') }}</div>
                <div class="kpi__value">{{ kpi.openJobs }}</div>
                <div class="kpi__hint muted small">{{ i18n.t('analytics.kpi.of') }} {{ kpi.totalJobs }} {{ i18n.t('analytics.kpi.total') }}</div>
              </div>

              <div class="analytics-kpi">
                <div class="analytics-kpi__icon"><lucide-angular [img]="icons.candidates" [size]="16"></lucide-angular></div>
                <div class="kpi__label">{{ i18n.t('analytics.kpi.candidates') }}</div>
                <div class="kpi__value">{{ kpi.totalCandidates }}</div>
                <div class="kpi__hint muted small">{{ i18n.t('analytics.kpi.inPipeline') }}</div>
              </div>

              <div class="analytics-kpi">
                <div class="analytics-kpi__icon"><lucide-angular [img]="icons.activity" [size]="16"></lucide-angular></div>
                <div class="kpi__label">{{ i18n.t('analytics.kpi.processed') }}</div>
                <div class="kpi__value">{{ kpi.processed }}</div>
                <div class="kpi__hint muted small">
                  {{ i18n.t('analytics.kpi.processing') }} {{ kpi.processing }} | {{ i18n.t('analytics.kpi.errors') }} {{ kpi.error }}
                </div>
              </div>

              <div class="analytics-kpi">
                <div class="analytics-kpi__icon"><lucide-angular [img]="icons.target" [size]="16"></lucide-angular></div>
                <div class="kpi__label">{{ i18n.t('analytics.kpi.avgScore') }}</div>
                <div class="kpi__value">{{ kpi.avgScore ?? '-' }}</div>
                <div class="kpi__hint muted small">{{ i18n.t('analytics.kpi.outOf100') }}</div>
              </div>

              <div class="analytics-kpi">
                <div class="analytics-kpi__icon"><lucide-angular [img]="icons.clock" [size]="16"></lucide-angular></div>
                <div class="kpi__label">{{ i18n.t('analytics.kpi.avgProcessing') }}</div>
                <div class="kpi__value">{{ kpi.avgProcessingMinutes ?? '-' }}</div>
                <div class="kpi__hint muted small">{{ i18n.t('analytics.kpi.minutesApprox') }}</div>
              </div>
            </div>
          </div>

          <div class="card analytics-chart-card" appRevealOnScroll [revealDelay]="80">
            <div class="analytics-card-head">
              <div>
                <div class="strong">{{ i18n.t('analytics.chart.submitted14Days') }}</div>
                <div class="muted small">{{ i18n.t('analytics.chart.trendLine') }}</div>
              </div>
              <span class="analytics-card-icon"><lucide-angular [img]="icons.chart" [size]="16"></lucide-angular></span>
            </div>
            <div class="analytics-chart-h">
              <canvas #chartCandidatesByDay></canvas>
            </div>
          </div>
        </div>

        <div class="analytics-grid">
          <div class="card analytics-chart-card" appRevealOnScroll>
            <div class="analytics-card-head">
              <div>
                <div class="strong">{{ i18n.t('analytics.chart.candidatesByStatus') }}</div>
                <div class="muted small">{{ i18n.t('analytics.chart.doughnut') }}</div>
              </div>
            </div>
            <div class="analytics-chart-h">
              <canvas #chartCandidatesByStatus></canvas>
            </div>
          </div>

          <div class="card analytics-chart-card" appRevealOnScroll [revealDelay]="90">
            <div class="analytics-card-head">
              <div>
                <div class="strong">{{ i18n.t('analytics.chart.jobsByStatus') }}</div>
                <div class="muted small">{{ i18n.t('analytics.chart.pie') }}</div>
              </div>
            </div>
            <div class="analytics-chart-h">
              <canvas #chartJobsByStatus></canvas>
            </div>
          </div>
        </div>

        <div class="analytics-grid">
          <div class="card analytics-chart-card" appRevealOnScroll>
            <div class="analytics-card-head">
              <div>
                <div class="strong">{{ i18n.t('analytics.chart.scoreDistribution') }}</div>
                <div class="muted small">{{ i18n.t('analytics.chart.histogram') }}</div>
              </div>
            </div>
            <div class="analytics-chart-h">
              <canvas #chartScoreHistogram></canvas>
            </div>
          </div>

          <div class="card analytics-chart-card" appRevealOnScroll [revealDelay]="90">
            <div class="analytics-card-head">
              <div>
                <div class="strong">{{ i18n.t('analytics.chart.candidatesPerJob') }}</div>
                <div class="muted small">{{ i18n.t('analytics.chart.bar') }}</div>
              </div>
            </div>
            <div class="analytics-chart-h">
              <canvas #chartCandidatesByJob></canvas>
            </div>
          </div>
        </div>

        <div class="card analytics-chart-card" appRevealOnScroll>
          <div class="analytics-card-head">
            <div>
              <div class="strong">{{ i18n.t('analytics.chart.topMissingFields') }}</div>
              <div class="muted small">{{ i18n.t('analytics.chart.topMissingHint') }}</div>
            </div>
          </div>
          <div class="analytics-chart-h analytics-chart-h--tall">
            <canvas #chartMissingFields></canvas>
          </div>
        </div>

        <div class="cmp-section" appRevealOnScroll [revealDelay]="120">
          <div class="cmp-header">
            <div class="cmp-header__title">
              <span class="cmp-header__icon"><lucide-angular [img]="icons.compare" [size]="18"></lucide-angular></span>
              <div>
                <h2>{{ i18n.t('analytics.compare.title') }}</h2>
                <p class="muted small">{{ i18n.t('analytics.compare.subtitle') }}</p>
              </div>
            </div>
          </div>

          <div class="cmp-selectors">
            <div class="cmp-select-wrap">
              <label class="cmp-label cmp-label--a" for="cmpJobA">{{ i18n.t('analytics.compare.jobA') }}</label>
              <select
                id="cmpJobA"
                class="cmp-select"
                [ngModel]="compareJobA ?? ''"
                (ngModelChange)="onCompareJobChange('A', $event)"
              >
                <option value="">{{ i18n.t('analytics.compare.selectJob') }}</option>
                <option *ngFor="let job of comparableJobs" [value]="jobKey(job)" [disabled]="jobKey(job) === compareJobB">
                  {{ job.title || i18n.t('analytics.untitled') }}
                </option>
              </select>
            </div>
            <span class="cmp-vs">{{ i18n.t('analytics.compare.vs') }}</span>
            <div class="cmp-select-wrap">
              <label class="cmp-label cmp-label--b" for="cmpJobB">{{ i18n.t('analytics.compare.jobB') }}</label>
              <select
                id="cmpJobB"
                class="cmp-select"
                [ngModel]="compareJobB ?? ''"
                (ngModelChange)="onCompareJobChange('B', $event)"
              >
                <option value="">{{ i18n.t('analytics.compare.selectJob') }}</option>
                <option *ngFor="let job of comparableJobs" [value]="jobKey(job)" [disabled]="jobKey(job) === compareJobA">
                  {{ job.title || i18n.t('analytics.untitled') }}
                </option>
              </select>
            </div>
          </div>

          <ng-container *ngIf="compareReady; else comparePlaceholder">
            <ng-container *ngIf="cmpData as cmp">
              <div class="cmp-kpi-row">
                <div class="cmp-kpi-card cmp-kpi-card--a">
                  <div class="cmp-kpi-card__label">{{ cmp.titleA }}</div>
                  <div class="cmp-kpi-card__grid">
                    <div class="cmp-kpi-item"><span class="cmp-kpi-item__val">{{ cmp.countA }}</span><span class="cmp-kpi-item__lbl">{{ i18n.t('analytics.compare.kpi.candidates') }}</span></div>
                    <div class="cmp-kpi-item"><span class="cmp-kpi-item__val">{{ cmp.avgA }}</span><span class="cmp-kpi-item__lbl">{{ i18n.t('analytics.compare.kpi.avgScore') }}</span></div>
                    <div class="cmp-kpi-item"><span class="cmp-kpi-item__val">{{ cmp.medianA }}</span><span class="cmp-kpi-item__lbl">{{ i18n.t('analytics.compare.kpi.median') }}</span></div>
                    <div class="cmp-kpi-item"><span class="cmp-kpi-item__val">{{ cmp.pctAbove60A }}%</span><span class="cmp-kpi-item__lbl">{{ i18n.t('analytics.compare.kpi.gte60') }}</span></div>
                    <div class="cmp-kpi-item"><span class="cmp-kpi-item__val">{{ cmp.pctAbove80A }}%</span><span class="cmp-kpi-item__lbl">{{ i18n.t('analytics.compare.kpi.gte80') }}</span></div>
                    <div class="cmp-kpi-item"><span class="cmp-kpi-item__val">{{ cmp.shortlistedPctA }}%</span><span class="cmp-kpi-item__lbl">{{ i18n.t('analytics.compare.kpi.shortlisted') }}</span></div>
                  </div>
                </div>
                <div class="cmp-kpi-card cmp-kpi-card--b">
                  <div class="cmp-kpi-card__label">{{ cmp.titleB }}</div>
                  <div class="cmp-kpi-card__grid">
                    <div class="cmp-kpi-item"><span class="cmp-kpi-item__val">{{ cmp.countB }}</span><span class="cmp-kpi-item__lbl">{{ i18n.t('analytics.compare.kpi.candidates') }}</span></div>
                    <div class="cmp-kpi-item"><span class="cmp-kpi-item__val">{{ cmp.avgB }}</span><span class="cmp-kpi-item__lbl">{{ i18n.t('analytics.compare.kpi.avgScore') }}</span></div>
                    <div class="cmp-kpi-item"><span class="cmp-kpi-item__val">{{ cmp.medianB }}</span><span class="cmp-kpi-item__lbl">{{ i18n.t('analytics.compare.kpi.median') }}</span></div>
                    <div class="cmp-kpi-item"><span class="cmp-kpi-item__val">{{ cmp.pctAbove60B }}%</span><span class="cmp-kpi-item__lbl">{{ i18n.t('analytics.compare.kpi.gte60') }}</span></div>
                    <div class="cmp-kpi-item"><span class="cmp-kpi-item__val">{{ cmp.pctAbove80B }}%</span><span class="cmp-kpi-item__lbl">{{ i18n.t('analytics.compare.kpi.gte80') }}</span></div>
                    <div class="cmp-kpi-item"><span class="cmp-kpi-item__val">{{ cmp.shortlistedPctB }}%</span><span class="cmp-kpi-item__lbl">{{ i18n.t('analytics.compare.kpi.shortlisted') }}</span></div>
                  </div>
                </div>
              </div>

              <div class="analytics-grid">
                <div class="card analytics-chart-card">
                  <div class="analytics-card-head">
                    <div>
                      <div class="strong">{{ i18n.t('analytics.compare.scoreDistributionOverlay') }}</div>
                      <div class="muted small">{{ i18n.t('analytics.compare.histogramComparison') }}</div>
                    </div>
                  </div>
                  <div class="analytics-chart-h"><canvas #chartCmpScoreHist></canvas></div>
                </div>
                <div class="card analytics-chart-card">
                  <div class="analytics-card-head">
                    <div>
                      <div class="strong">{{ i18n.t('analytics.compare.scoreMetrics') }}</div>
                      <div class="muted small">{{ i18n.t('analytics.compare.scoreMetricsHint') }}</div>
                    </div>
                  </div>
                  <div class="analytics-chart-h"><canvas #chartCmpScoreBox></canvas></div>
                </div>
              </div>

              <div class="analytics-grid">
                <div class="card analytics-chart-card">
                  <div class="analytics-card-head">
                    <div>
                      <div class="strong">{{ i18n.t('analytics.compare.statusBreakdown') }}</div>
                      <div class="muted small">{{ i18n.t('analytics.compare.candidatesPerStatus') }}</div>
                    </div>
                  </div>
                  <div class="analytics-chart-h"><canvas #chartCmpStatus></canvas></div>
                </div>
                <div class="card analytics-chart-card">
                  <div class="analytics-card-head">
                    <div>
                      <div class="strong">{{ i18n.t('analytics.compare.qualityRadar') }}</div>
                      <div class="muted small">{{ i18n.t('analytics.compare.qualityRadarHint') }}</div>
                    </div>
                  </div>
                  <div class="analytics-chart-h"><canvas #chartCmpRadar></canvas></div>
                </div>
              </div>

              <div class="card analytics-chart-card">
                <div class="analytics-card-head">
                  <div>
                    <div class="strong">{{ i18n.t('analytics.compare.missingFieldsComparison') }}</div>
                    <div class="muted small">{{ i18n.t('analytics.compare.missingFieldsHint') }}</div>
                  </div>
                </div>
                <div class="analytics-chart-h analytics-chart-h--tall"><canvas #chartCmpMissing></canvas></div>
              </div>
            </ng-container>
          </ng-container>

          <ng-template #comparePlaceholder>
            <div class="cmp-placeholder">
              <lucide-angular [img]="icons.compare" [size]="32"></lucide-angular>
              <p>{{ i18n.t('analytics.compare.placeholder') }}</p>
            </div>
          </ng-template>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      :host {
        --bg: #f6f7f9;
        --panel: #ffffff;
        --panel-2: #f3f4f6;
        --border: #e5e7eb;
        --text: #111827;
        --muted: #6b7280;
        --accent: #8b1f1f;
        --accent-soft-bg: rgba(139, 31, 31, 0.1);
        --accent-soft-border: rgba(139, 31, 31, 0.35);
        --ok: #16a34a;
        --danger: #dc2626;
        --radius: 14px;
        --radius-sm: 10px;
      }
   
      .analytics-page {
        max-width: 1100px;
        margin: 0 auto;
        padding: 1.5rem;
        display: grid;
        gap: 14px;
      }

      .analytics-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .analytics-refresh-btn {
        min-height: 40px;
      }

      .analytics-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .analytics-grid--lead {
        margin-top: 4px;
      }

      .card {
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--panel);
        padding: 14px;
      }

      .analytics-kpi-wrap {
        border-color: color-mix(in srgb, var(--border) 72%, var(--accent-soft-border) 28%);
        background: linear-gradient(180deg, color-mix(in srgb, var(--panel) 95%, var(--accent) 5%), var(--panel));
      }

      .analytics-kpi-grid {
        margin-top: 12px;
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .analytics-kpi {
        border: 1px solid var(--border);
        background: var(--panel);
        border-radius: var(--radius-sm);
        padding: 12px;
      }

      .analytics-kpi__icon {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        border: 1px solid var(--accent-soft-border);
        background: var(--accent-soft-bg);
        color: var(--accent);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
      }

      .analytics-chart-card {
        border-color: color-mix(in srgb, var(--border) 72%, var(--accent-soft-border) 28%);
        background: linear-gradient(180deg, var(--panel), color-mix(in srgb, var(--panel) 96%, var(--accent) 4%));
      }

      .analytics-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .analytics-card-icon {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: var(--panel-2);
        color: var(--muted);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .analytics-chart-h {
        height: 260px;
        margin-top: 10px;
      }

      .analytics-chart-h--tall {
        height: 320px;
      }

      .analytics-fade {
        opacity: 0;
        transform: translateY(16px);
        animation: analytics-fade-up 460ms ease forwards;
      }

      .skeleton {
        background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
        background-size: 200% 100%;
        border-radius: 8px;
        animation: shimmer 1.2s infinite;
      }

      .reveal {
        opacity: 0;
        transform: translateY(16px);
        transition: opacity 600ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--reveal-delay, 0ms),
          transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--reveal-delay, 0ms);
      }

      .reveal.reveal--visible {
        opacity: 1;
        transform: translateY(0);
      }

      @media (min-width: 760px) {
        .analytics-grid {
          grid-template-columns: 1fr 1fr;
        }

        .analytics-kpi-grid {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (min-width: 1040px) {
        .analytics-kpi-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @keyframes analytics-fade-up {
        from {
          opacity: 0;
          transform: translateY(16px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes shimmer {
        0% { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }

      .cmp-section {
        margin-top: 24px;
        display: grid;
        gap: 14px;
      }

      .cmp-header {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .cmp-header__title {
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }

      .cmp-header__title h2 {
        margin: 0;
        font-size: 1.15rem;
      }

      .cmp-header__icon {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        border: 1px solid var(--accent-soft-border);
        background: var(--accent-soft-bg);
        color: var(--accent);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .cmp-selectors {
        display: flex;
        align-items: flex-end;
        gap: 10px;
        flex-wrap: wrap;
      }

      .cmp-select-wrap {
        flex: 1;
        min-width: 200px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .cmp-label {
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .cmp-label--a { color: rgba(59, 130, 246, 0.85); }
      .cmp-label--b { color: rgba(220, 38, 38, 0.85); }

      .cmp-select {
        width: 100%;
        padding: 0.5rem 0.65rem;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--panel);
        color: var(--text);
        font-size: 0.9rem;
      }
      .cmp-select:focus {
        outline: none;
        border-color: var(--accent);
      }

      .cmp-vs {
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding-bottom: 10px;
      }

      .cmp-kpi-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .cmp-kpi-card {
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 14px;
        background: var(--panel);
      }

      .cmp-kpi-card--a {
        border-left: 3px solid rgba(59, 130, 246, 0.6);
      }

      .cmp-kpi-card--b {
        border-left: 3px solid rgba(220, 38, 38, 0.6);
      }

      .cmp-kpi-card__label {
        font-weight: 600;
        font-size: 0.88rem;
        margin-bottom: 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .cmp-kpi-card__grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .cmp-kpi-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        text-align: center;
      }

      .cmp-kpi-item__val {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--text);
      }

      .cmp-kpi-item__lbl {
        font-size: 0.7rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .cmp-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 48px 20px;
        border: 1px dashed var(--border);
        border-radius: var(--radius);
        background: var(--panel-2);
        color: var(--muted);
        text-align: center;
      }

      .cmp-placeholder p {
        margin: 0;
        font-size: 0.88rem;
      }


      .muted {
        color: var(--muted);
      }

      .small {
        font-size: 0.78rem;
      }

      .strong {
        font-weight: 700;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        background: var(--panel);
        color: var(--text);
      }

      .btn--ghost {
        border: 1px solid var(--border);
        background: transparent;
        color: var(--text);
      }

      .btn--ghost:hover:not(:disabled) { background: var(--panel-2); }

      .alert {
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 500;
      }

      .alert--error {
        background: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fecaca;
      }

      @media (max-width: 759px) {
        .cmp-kpi-row {
          grid-template-columns: 1fr;
        }

        .cmp-kpi-card__grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `,
  ],
})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly icons = {
    refresh: RefreshCw,
    jobs: BriefcaseBusiness,
    candidates: Users,
    activity: Activity,
    target: Target,
    clock: Clock3,
    chart: BarChart3,
    compare: GitCompareArrows,
  };

  loading = true;
  error: string | null = null;
  jobs: JobPosting[] = [];
  candidates: AnalyticsCandidate[] = [];
  jobStatuses: string[] = [];
  candidateStatuses: string[] = [];
  lastRefreshedAt: string | null = null;

  compareJobA: string | null = null;
  compareJobB: string | null = null;

  @ViewChild('chartCandidatesByDay', { static: false }) chartCandidatesByDay?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCandidatesByStatus', { static: false }) chartCandidatesByStatus?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartJobsByStatus', { static: false }) chartJobsByStatus?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartScoreHistogram', { static: false }) chartScoreHistogram?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCandidatesByJob', { static: false }) chartCandidatesByJob?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartMissingFields', { static: false }) chartMissingFields?: ElementRef<HTMLCanvasElement>;

  @ViewChild('chartCmpScoreHist', { static: false }) chartCmpScoreHist?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCmpStatus', { static: false }) chartCmpStatus?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCmpRadar', { static: false }) chartCmpRadar?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCmpMissing', { static: false }) chartCmpMissing?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCmpScoreBox', { static: false }) chartCmpScoreBox?: ElementRef<HTMLCanvasElement>;

  private viewReady = false;
  private charts: Chart[] = [];
  private compareCharts: Chart[] = [];
  private langSub?: Subscription;

  constructor(
    private candidateService: CandidateService,
    private jobPostingService: JobPostingService,
    private http: HttpClient,
    private host: ElementRef,
    public i18n: I18nService
  ) {}

  get kpi() {
    const openJobs = this.jobs.filter((j) => j.status === 'open').length;
    const totalJobs = this.jobs.length;
    const totalCandidates = this.candidates.length;

    const processed = this.candidates.filter((c) => c.status === 'processed').length;
    const processing = this.candidates.filter((c) => c.status === 'processing').length;
    const error = this.candidates.filter((c) => c.status === 'error').length;

    const scores = this.candidates
      .map((c) => c.score)
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    const avgScore = scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

    const processedMs = this.candidates
      .filter((c) => c.status === 'processed' || c.status === 'error')
      .map((c) => safeMsBetween(c.createdAt, c.updatedAt))
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    const avgMs = processedMs.length
      ? Math.round(processedMs.reduce((a, b) => a + b, 0) / processedMs.length)
      : null;

    return {
      totalJobs,
      openJobs,
      totalCandidates,
      processed,
      processing,
      error,
      avgScore,
      avgProcessingMinutes: avgMs != null ? Math.max(0, Math.round(avgMs / 60000)) : null,
    };
  }

  get compareReady(): boolean {
    return this.compareJobA != null && this.compareJobB != null && this.compareJobA !== this.compareJobB;
  }

  get comparableJobs(): JobPosting[] {
    return this.jobs;
  }

  get cmpData() {
    const a = this.compareJobA;
    const b = this.compareJobB;
    if (a == null || b == null || a === b) return null;

    const jobA = this.jobs.find((j) => this.jobKey(j) === a);
    const jobB = this.jobs.find((j) => this.jobKey(j) === b);
    if (!jobA || !jobB) return null;

    const candA = this.candidates.filter((c) => this.matchesJobCandidate(jobA, c));
    const candB = this.candidates.filter((c) => this.matchesJobCandidate(jobB, c));

    const scoresFn = (cands: AnalyticsCandidate[]) =>
      cands.map((c) => c.score).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    const avgFn = (nums: number[]) =>
      nums.length ? Math.round((nums.reduce((s, v) => s + v, 0) / nums.length) * 10) / 10 : 0;
    const medianFn = (nums: number[]) => {
      if (!nums.length) return 0;
      const sorted = [...nums].sort((x, y) => x - y);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0
        ? sorted[mid]
        : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
    };
    const histFn = (cands: AnalyticsCandidate[]) => {
      const h = [0, 0, 0, 0, 0];
      for (const c of cands) {
        const s = c.score;
        if (typeof s !== 'number' || !Number.isFinite(s)) continue;
        const idx = Math.min(4, Math.floor(clamp(s, 0, 100) / 20));
        h[idx]++;
      }
      return h;
    };
    const statusCountFn = (cands: AnalyticsCandidate[]) => {
      const m: Record<string, number> = {};
      for (const c of cands) inc(m, c.status ?? 'unknown');
      return m;
    };
    const missingFn = (cands: AnalyticsCandidate[]) => {
      const m: Record<string, number> = {};
      for (const c of cands) for (const f of c.missing ?? []) inc(m, f);
      return m;
    };
    const pctAbove = (cands: AnalyticsCandidate[], threshold: number) => {
      const scores = scoresFn(cands);
      if (!scores.length) return 0;
      return Math.round((scores.filter((s) => s >= threshold).length / scores.length) * 100);
    };
    const avgProcessingFn = (cands: AnalyticsCandidate[]) => {
      const ms = cands
        .filter((c) => c.status === 'processed' || c.status === 'error')
        .map((c) => safeMsBetween(c.createdAt, c.updatedAt))
        .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
      return ms.length ? Math.round(ms.reduce((s, v) => s + v, 0) / ms.length / 60000) : 0;
    };

    const scoresA = scoresFn(candA);
    const scoresB = scoresFn(candB);

    return {
      titleA: jobA.title ?? this.i18n.t('analytics.compare.jobA'),
      titleB: jobB.title ?? this.i18n.t('analytics.compare.jobB'),
      countA: candA.length,
      countB: candB.length,
      avgA: avgFn(scoresA),
      avgB: avgFn(scoresB),
      medianA: medianFn(scoresA),
      medianB: medianFn(scoresB),
      histA: histFn(candA),
      histB: histFn(candB),
      statusA: statusCountFn(candA),
      statusB: statusCountFn(candB),
      missingA: missingFn(candA),
      missingB: missingFn(candB),
      pctAbove60A: pctAbove(candA, 60),
      pctAbove60B: pctAbove(candB, 60),
      pctAbove80A: pctAbove(candA, 80),
      pctAbove80B: pctAbove(candB, 80),
      shortlistedPctA: candA.length
        ? Math.round((candA.filter((c) => c.status === 'shortlisted' || c.status === 'hired').length / candA.length) * 100)
        : 0,
      shortlistedPctB: candB.length
        ? Math.round((candB.filter((c) => c.status === 'shortlisted' || c.status === 'hired').length / candB.length) * 100)
        : 0,
      avgProcessingA: avgProcessingFn(candA),
      avgProcessingB: avgProcessingFn(candB),
      missingAvgA: candA.length
        ? Math.round((candA.reduce((s, c) => s + (c.missing?.length ?? 0), 0) / candA.length) * 10) / 10
        : 0,
      missingAvgB: candB.length
        ? Math.round((candB.reduce((s, c) => s + (c.missing?.length ?? 0), 0) / candB.length) * 10) / 10
        : 0,
    };
  }


  async ngOnInit() {
    this.langSub = this.i18n.lang$.subscribe(() => {
      window.setTimeout(() => this.renderCharts(), 0);
      window.setTimeout(() => this.renderCompareCharts(), 0);
    });
    await this.refresh();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.renderCharts();
    this.renderCompareCharts();
  }

  ngOnDestroy() {
    this.destroyCharts();
    this.destroyCompareCharts();
    if (this.langSub) this.langSub.unsubscribe();
  }

  onCompareJobChange(slot: 'A' | 'B', value: string) {
    const key = value || null;
    if (slot === 'A') this.compareJobA = key;
    else this.compareJobB = key;
    window.setTimeout(() => this.renderCompareCharts(), 0);
  }

  jobKey(job: JobPosting): string {
    if (job.documentId) return job.documentId;
    if (job.id != null) return String(job.id);
    return '';
  }

  private candidateStatusLabel(status: string): string {
    const key = `candidateDetail.status.${status}`;
    const label = this.i18n.t(key);
    return label === key ? status : label;
  }

  private jobStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'jobs.statusDraft',
      open: 'jobs.statusOpen',
      closed: 'jobs.statusClosed',
    };
    const key = map[status];
    if (key) {
      const label = this.i18n.t(key);
      return label === key ? status : label;
    }
    return status;
  }

  private missingFieldLabel(raw: string): string {
    const normalized = raw.trim().toLowerCase();
    const map: Record<string, string> = {
      'full name': 'candidateDetail.missing.fullName',
      email: 'candidateDetail.missing.email',
      phone: 'candidateDetail.missing.phone',
      location: 'candidateDetail.missing.location',
      linkedin: 'candidateDetail.missing.linkedin',
      portfolio: 'candidateDetail.missing.portfolio',
      summary: 'candidateDetail.missing.summary',
      skills: 'candidateDetail.missing.skills',
      experience: 'candidateDetail.missing.experience',
      'experience dates': 'candidateDetail.missing.experienceDates',
      education: 'candidateDetail.missing.education',
      projects: 'candidateDetail.missing.projects',
    };
    const key = map[normalized];
    if (!key) return raw;
    const label = this.i18n.t(key);
    return label === key ? raw : label;
  }

  private matchesJobCandidate(job: JobPosting, candidate: AnalyticsCandidate): boolean {
    const jobId = job.id != null ? String(job.id) : null;
    const jobDoc = job.documentId || null;
    const jobTitle = job.title ? job.title.trim().toLowerCase() : null;
    const candidateKey = candidate.jobKey || null;
    const candidateId = candidate.jobId != null ? String(candidate.jobId) : null;
    const candidateTitle = candidate.jobTitle ? candidate.jobTitle.trim().toLowerCase() : null;

    if (candidateKey && jobDoc && candidateKey === jobDoc) return true;
    if (candidateKey && jobId && candidateKey === jobId) return true;
    if (candidateId && jobId && candidateId === jobId) return true;
    if (candidateTitle && jobTitle && candidateTitle === jobTitle) return true;
    return false;
  }

  async refresh() {
    try {
      this.loading = true;
      this.error = null;

      const meta = await firstValueFrom(
        this.http.get<{ jobPostingStatuses?: string[]; candidateStatuses?: string[] }>('http://localhost:1337/api/meta')
      );
      this.jobStatuses = Array.isArray(meta?.jobPostingStatuses) ? meta.jobPostingStatuses : [];
      this.candidateStatuses = Array.isArray(meta?.candidateStatuses) ? meta.candidateStatuses : [];

      const [jobs, candidates] = await Promise.all([
        firstValueFrom(this.jobPostingService.getAll()),
        firstValueFrom(this.candidateService.listForAnalytics()),
      ]);
      this.jobs = jobs ?? [];
      this.candidates = candidates ?? [];
      this.lastRefreshedAt = new Date().toISOString();
    } catch (e) {
      this.error = this.toErrorMessage(e);
    } finally {
      this.loading = false;
      window.setTimeout(() => this.renderCharts(), 0);
      window.setTimeout(() => this.renderCompareCharts(), 0);
    }
  }

  formatDateTime(value: string | null): string {
    if (!value) return '-';
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return '-';
    return d.toLocaleString();
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return this.i18n.t('analytics.error.unexpected');
    }
  }

  private readThemeVars(): ThemeVars {
    const css = getComputedStyle(this.host.nativeElement as HTMLElement);
    const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    return {
      text: get('--text', '#111827'),
      muted: get('--muted', '#6b7280'),
      border: get('--border', '#e5e7eb'),
      panel2: get('--panel-2', '#f3f4f6'),
      accent: get('--accent', '#8b1f1f'),
      ok: get('--ok', '#16a34a'),
      danger: get('--danger', '#dc2626'),
    };
  }

  private destroyCharts() {
    for (const c of this.charts) c.destroy();
    this.charts = [];
  }

  private renderCharts() {
    if (!this.viewReady) return;
    const el = (r?: ElementRef<HTMLCanvasElement>) => r?.nativeElement ?? null;
    if (
      !el(this.chartCandidatesByDay) ||
      !el(this.chartCandidatesByStatus) ||
      !el(this.chartJobsByStatus) ||
      !el(this.chartScoreHistogram) ||
      !el(this.chartCandidatesByJob) ||
      !el(this.chartMissingFields)
    ) {
      return;
    }

    const colors = this.readThemeVars();

    const candidates = this.candidates;
    const jobs = this.jobs;

    const daysBack = 14;
    const now = new Date();
    const dayLabels: string[] = [];
    const dayCounts: number[] = [];
    const countsByDay: Record<string, number> = {};

    for (const c of candidates) {
      const key = dayKey(c.createdAt);
      if (key) inc(countsByDay, key);
    }

    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;
      dayLabels.push(`${m}/${day}`);
      dayCounts.push(countsByDay[key] ?? 0);
    }

    const statusOrder = this.candidateStatuses.length > 0
      ? this.candidateStatuses
      : ['new', 'processing', 'processed', 'reviewing', 'shortlisted', 'rejected', 'hired', 'error'];
    const candCounts: Record<string, number> = {};
    for (const c of candidates) inc(candCounts, c.status ?? 'unknown');
    const candStatusKeys = statusOrder.filter((s) => (candCounts[s] ?? 0) > 0);
    const candStatusLabels = candStatusKeys.map((s) => this.candidateStatusLabel(s));
    const candStatusData = candStatusKeys.map((s) => candCounts[s] ?? 0);

    const jobOrder = this.jobStatuses.length > 0 ? this.jobStatuses : ['draft', 'open', 'closed'];
    const jobCounts: Record<string, number> = {};
    for (const j of jobs) inc(jobCounts, j.status ?? 'unknown');
    const jobStatusKeys = jobOrder.filter((s) => (jobCounts[s] ?? 0) > 0);
    const jobStatusLabels = jobStatusKeys.map((s) => this.jobStatusLabel(s));
    const jobStatusData = jobStatusKeys.map((s) => jobCounts[s] ?? 0);

    const histLabels = ['0-19', '20-39', '40-59', '60-79', '80-100'];
    const histCounts = [0, 0, 0, 0, 0];
    for (const c of candidates) {
      const s = c.score;
      if (typeof s !== 'number' || !Number.isFinite(s)) continue;
      const score = clamp(s, 0, 100);
      const idx = Math.min(histCounts.length - 1, Math.floor(score / 20));
      histCounts[idx] += 1;
    }

    const byJob: Record<string, number> = {};
    for (const c of candidates) inc(byJob, c.jobTitle || this.i18n.t('analytics.unknownJob'));
    const topJobs = topEntries(byJob, 8);
    const topJobLabels = topJobs.map(([k]) => k);
    const topJobData = topJobs.map(([, v]) => v);

    const missingCounts: Record<string, number> = {};
    for (const c of candidates) {
      for (const m of c.missing ?? []) inc(missingCounts, m);
    }
    const topMissing = topEntries(missingCounts, 10);
    const missingLabels = topMissing.map(([k]) => this.missingFieldLabel(k));
    const missingData = topMissing.map(([, v]) => v);

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: colors.muted } as any },
        tooltip: { enabled: true } as any,
      },
    } as const;

    const gridColor = colors.border;
    const tickColor = colors.muted;

    const lineConfig: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: dayLabels,
        datasets: [
          {
            label: this.i18n.t('analytics.chart.candidates'),
            data: dayCounts,
            borderColor: colors.accent,
            backgroundColor: 'rgba(139,31,31,0.12)',
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        ...commonOptions,
        plugins: { ...commonOptions.plugins, legend: { display: false } as any },
        scales: {
          x: { ticks: { color: tickColor } as any, grid: { color: gridColor } as any },
          y: { ticks: { color: tickColor, precision: 0 } as any, grid: { color: gridColor } as any },
        },
      },
    };

    const candidatesByStatusConfig: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: candStatusLabels,
        datasets: [
          {
            label: this.i18n.t('analytics.chart.candidates'),
            data: candStatusData,
            backgroundColor: [
              'rgba(139,31,31,0.28)',
              'rgba(245,158,11,0.28)',
              'rgba(22,163,74,0.28)',
              'rgba(59,130,246,0.22)',
              'rgba(124,58,237,0.20)',
              'rgba(107,114,128,0.24)',
              'rgba(14,165,233,0.20)',
              'rgba(139,31,31,0.14)',
            ],
            borderColor: colors.border,
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...commonOptions,
        cutout: '60%' as any,
        plugins: { ...commonOptions.plugins, legend: { position: 'bottom' } as any },
      },
    };

    const jobsByStatusConfig: ChartConfiguration<'pie'> = {
      type: 'pie',
      data: {
        labels: jobStatusLabels,
        datasets: [
          {
            label: this.i18n.t('analytics.chart.jobPostings'),
            data: jobStatusData,
            backgroundColor: ['rgba(107,114,128,0.25)', 'rgba(139,31,31,0.22)', 'rgba(17,24,39,0.15)'],
            borderColor: colors.border,
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...commonOptions,
        plugins: { ...commonOptions.plugins, legend: { position: 'bottom' } as any },
      },
    };

    const histogramConfig: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: histLabels,
        datasets: [
          {
            label: this.i18n.t('analytics.chart.candidates'),
            data: histCounts,
            borderColor: colors.accent,
            backgroundColor: 'rgba(139,31,31,0.20)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...commonOptions,
        plugins: { ...commonOptions.plugins, legend: { display: false } as any },
        scales: {
          x: { ticks: { color: tickColor } as any, grid: { color: gridColor } as any },
          y: { ticks: { color: tickColor, precision: 0 } as any, grid: { color: gridColor } as any },
        },
      },
    };

    const byJobConfig: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: topJobLabels,
        datasets: [
          {
            label: this.i18n.t('analytics.chart.candidates'),
            data: topJobData,
            borderColor: colors.ok,
            backgroundColor: 'rgba(22,163,74,0.20)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...commonOptions,
        indexAxis: 'y' as const,
        plugins: { ...commonOptions.plugins, legend: { display: false } as any },
        scales: {
          x: { ticks: { color: tickColor, precision: 0 } as any, grid: { color: gridColor } as any },
          y: { ticks: { color: tickColor } as any, grid: { color: gridColor } as any },
        },
      },
    };

    const missingConfig: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: missingLabels,
        datasets: [
          {
            label: this.i18n.t('analytics.chart.missing'),
            data: missingData,
            borderColor: colors.danger,
            backgroundColor: 'rgba(220,38,38,0.20)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...commonOptions,
        indexAxis: 'y' as const,
        plugins: { ...commonOptions.plugins, legend: { display: false } as any },
        scales: {
          x: { ticks: { color: tickColor, precision: 0 } as any, grid: { color: gridColor } as any },
          y: { ticks: { color: tickColor } as any, grid: { color: gridColor } as any },
        },
      },
    };

    this.destroyCharts();
    this.charts.push(
      new Chart(this.chartCandidatesByDay!.nativeElement, lineConfig),
      new Chart(this.chartCandidatesByStatus!.nativeElement, candidatesByStatusConfig),
      new Chart(this.chartJobsByStatus!.nativeElement, jobsByStatusConfig),
      new Chart(this.chartScoreHistogram!.nativeElement, histogramConfig),
      new Chart(this.chartCandidatesByJob!.nativeElement, byJobConfig),
      new Chart(this.chartMissingFields!.nativeElement, missingConfig)
    );
  }

  private destroyCompareCharts() {
    for (const c of this.compareCharts) c.destroy();
    this.compareCharts = [];
  }

  private renderCompareCharts() {
    if (!this.viewReady) return;
    const data = this.cmpData;
    if (!data) {
      this.destroyCompareCharts();
      return;
    }

    const el = (r?: ElementRef<HTMLCanvasElement>) => r?.nativeElement ?? null;
    if (!el(this.chartCmpScoreHist) || !el(this.chartCmpStatus) || !el(this.chartCmpRadar) || !el(this.chartCmpMissing) || !el(this.chartCmpScoreBox)) return;

    const colors = this.readThemeVars();
    const gridColor = colors.border;
    const tickColor = colors.muted;
    const colorA = 'rgba(59,130,246,0.7)';
    const colorABg = 'rgba(59,130,246,0.18)';
    const colorB = 'rgba(220,38,38,0.7)';
    const colorBBg = 'rgba(220,38,38,0.18)';

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: colors.muted } as any },
        tooltip: { enabled: true } as any,
      },
    } as const;

    const histLabels = ['0-19', '20-39', '40-59', '60-79', '80-100'];
    const scoreHistConfig: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: histLabels,
        datasets: [
          { label: data.titleA, data: data.histA, backgroundColor: colorA, borderColor: colorA, borderWidth: 1 },
          { label: data.titleB, data: data.histB, backgroundColor: colorB, borderColor: colorB, borderWidth: 1 },
        ],
      },
      options: {
        ...commonOptions,
        scales: {
          x: { ticks: { color: tickColor } as any, grid: { color: gridColor } as any },
          y: { ticks: { color: tickColor, precision: 0 } as any, grid: { color: gridColor } as any },
        },
      },
    };

    const allStatuses = Array.from(new Set([
      ...Object.keys(data.statusA),
      ...Object.keys(data.statusB),
    ])).sort();
    const statusLabels = allStatuses.map((s) => this.candidateStatusLabel(s));
    const statusConfig: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: statusLabels,
        datasets: [
          { label: data.titleA, data: allStatuses.map((s) => data.statusA[s] ?? 0), backgroundColor: colorA, borderColor: colorA, borderWidth: 1 },
          { label: data.titleB, data: allStatuses.map((s) => data.statusB[s] ?? 0), backgroundColor: colorB, borderColor: colorB, borderWidth: 1 },
        ],
      },
      options: {
        ...commonOptions,
        scales: {
          x: { ticks: { color: tickColor } as any, grid: { color: gridColor } as any },
          y: { ticks: { color: tickColor, precision: 0 } as any, grid: { color: gridColor } as any },
        },
      },
    };

    const radarConfig: ChartConfiguration<'radar'> = {
      type: 'radar',
      data: {
        labels: [
          this.i18n.t('analytics.compare.radar.avgScore'),
          this.i18n.t('analytics.compare.radar.medianScore'),
          this.i18n.t('analytics.compare.radar.pctGte60'),
          this.i18n.t('analytics.compare.radar.pctGte80'),
          this.i18n.t('analytics.compare.radar.shortlistedPct'),
          this.i18n.t('analytics.compare.radar.completeness'),
        ],
        datasets: [
          {
            label: data.titleA,
            data: [
              data.avgA,
              data.medianA,
              data.pctAbove60A,
              data.pctAbove80A,
              data.shortlistedPctA,
              Math.max(0, 100 - data.missingAvgA * 10),
            ],
            borderColor: colorA,
            backgroundColor: colorABg,
            pointBackgroundColor: colorA,
          },
          {
            label: data.titleB,
            data: [
              data.avgB,
              data.medianB,
              data.pctAbove60B,
              data.pctAbove80B,
              data.shortlistedPctB,
              Math.max(0, 100 - data.missingAvgB * 10),
            ],
            borderColor: colorB,
            backgroundColor: colorBBg,
            pointBackgroundColor: colorB,
          },
        ],
      },
      options: {
        ...commonOptions,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { color: tickColor, backdropColor: 'transparent' } as any,
            grid: { color: gridColor } as any,
            angleLines: { color: gridColor } as any,
            pointLabels: { color: colors.text, font: { size: 11 } } as any,
          },
        },
      },
    };

    const allMissing: Record<string, { a: number; b: number }> = {};
    for (const [k, v] of Object.entries(data.missingA)) {
      if (!allMissing[k]) allMissing[k] = { a: 0, b: 0 };
      allMissing[k].a = v;
    }
    for (const [k, v] of Object.entries(data.missingB)) {
      if (!allMissing[k]) allMissing[k] = { a: 0, b: 0 };
      allMissing[k].b = v;
    }
    const topMissingKeys = Object.entries(allMissing)
      .sort((x, y) => (y[1].a + y[1].b) - (x[1].a + x[1].b))
      .slice(0, 8)
      .map(([k]) => k);
    const missingDisplayLabels = topMissingKeys.map((k) => this.missingFieldLabel(k));

    const missingConfig: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: missingDisplayLabels,
        datasets: [
          { label: data.titleA, data: topMissingKeys.map((k) => allMissing[k]?.a ?? 0), backgroundColor: colorA, borderColor: colorA, borderWidth: 1 },
          { label: data.titleB, data: topMissingKeys.map((k) => allMissing[k]?.b ?? 0), backgroundColor: colorB, borderColor: colorB, borderWidth: 1 },
        ],
      },
      options: {
        ...commonOptions,
        indexAxis: 'y' as const,
        scales: {
          x: { ticks: { color: tickColor, precision: 0 } as any, grid: { color: gridColor } as any },
          y: { ticks: { color: tickColor } as any, grid: { color: gridColor } as any },
        },
      },
    };

    const scoreBoxConfig: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: [
          this.i18n.t('analytics.compare.scoreBox.avgScore'),
          this.i18n.t('analytics.compare.scoreBox.medianScore'),
          this.i18n.t('analytics.compare.scoreBox.pctGte60'),
          this.i18n.t('analytics.compare.scoreBox.pctGte80'),
        ],
        datasets: [
          { label: data.titleA, data: [data.avgA, data.medianA, data.pctAbove60A, data.pctAbove80A], backgroundColor: colorA, borderColor: colorA, borderWidth: 1 },
          { label: data.titleB, data: [data.avgB, data.medianB, data.pctAbove60B, data.pctAbove80B], backgroundColor: colorB, borderColor: colorB, borderWidth: 1 },
        ],
      },
      options: {
        ...commonOptions,
        scales: {
          x: { ticks: { color: tickColor } as any, grid: { color: gridColor } as any },
          y: { ticks: { color: tickColor, precision: 0 } as any, grid: { color: gridColor } as any, beginAtZero: true },
        },
      },
    };

    this.destroyCompareCharts();
    this.compareCharts.push(
      new Chart(this.chartCmpScoreHist!.nativeElement, scoreHistConfig),
      new Chart(this.chartCmpStatus!.nativeElement, statusConfig),
      new Chart(this.chartCmpRadar!.nativeElement, radarConfig),
      new Chart(this.chartCmpMissing!.nativeElement, missingConfig),
      new Chart(this.chartCmpScoreBox!.nativeElement, scoreBoxConfig)
    );
  }
}
