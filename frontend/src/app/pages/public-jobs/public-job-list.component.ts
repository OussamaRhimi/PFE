import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { JobPostingService, JobPosting } from '../../services/job-posting.service';
import { I18nService } from '../../services/i18n.service';
import { PublicNavbarComponent } from '../../components/public-navbar/public-navbar.component';
import { PublicFooterComponent } from '../../components/public-footer/public-footer.component';

@Component({
  selector: 'app-public-job-list',
  standalone: true,
  imports: [CommonModule, RouterModule, PublicNavbarComponent, PublicFooterComponent],
  template: `
    <app-public-navbar />

    <!-- ─── Hero section ─── -->
    <section class="hero">
      <h1>{{ i18n.t('public.hero') }}</h1>
      <p>{{ i18n.t('public.heroSub') }}</p>
    </section>

    <!-- ─── Content ─── -->
    <main class="pub-content">
      <!-- Search / filter bar -->
      <div class="search-bar">
        <input
          type="text"
          [placeholder]="i18n.t('public.searchPlaceholder')"
          (input)="onSearch($event)"
        />
        <span class="result-count" *ngIf="!loading">
          {{ filtered.length }} {{ filtered.length === 1 ? i18n.t('public.result') : i18n.t('public.results') }}
        </span>
      </div>

      <!-- Loading -->
      <p class="center" *ngIf="loading">{{ i18n.t('public.loading') }}</p>

      <!-- Error -->
      <div class="alert error" *ngIf="error">{{ error }}</div>

      <!-- Empty state -->
      <div class="empty-state" *ngIf="!loading && filtered.length === 0 && !error">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9aa0b4" stroke-width="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
        </svg>
        <p>{{ i18n.t('public.empty') }}</p>
      </div>

      <!-- ─── Job cards grid ─── -->
      <div class="cards-grid" *ngIf="!loading && filtered.length > 0">
        <article class="job-card" *ngFor="let job of filtered">
          <div class="card-top">
            <span class="badge badge-open">{{ i18n.t('public.open') }}</span>
            <span class="card-date">{{ job.createdAt | date:'mediumDate' }}</span>
          </div>

          <h2 class="card-title">{{ job.title }}</h2>

          <p class="card-desc" *ngIf="job.description">{{ job.description | slice:0:160 }}{{ job.description.length > 160 ? '…' : '' }}</p>

          <!-- Requirements pills -->
          <div class="card-meta" *ngIf="job.requirements">
            <div class="meta-row" *ngIf="job.requirements.departments.length">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span class="pill pill-dept" *ngFor="let d of job.requirements.departments">{{ d }}</span>
            </div>
            <div class="meta-row" *ngIf="job.requirements.skillsRequired.length">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
              <span class="pill" *ngFor="let s of job.requirements.skillsRequired">{{ s }}</span>
            </div>
            <div class="meta-row" *ngIf="job.requirements.minYearsExperience">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span class="exp-text">{{ job.requirements.minYearsExperience }}+ {{ i18n.t('public.yearsExp') }}</span>
            </div>
          </div>

          <a [routerLink]="['/jobs', job.documentId, 'apply']" class="btn-apply">
            {{ i18n.t('public.applyNow') }}
          </a>
        </article>
      </div>
    </main>

    <app-public-footer />
  `,
  styles: [`
    $logo-red: #c41e3a;
    $logo-red-mid: #d32f2f;
    $logo-red-deep: #a51c30;
    $gray-50: #f9fafb;
    $gray-100: #f1f3f7;
    $gray-200: #e5e8ef;
    $gray-300: #cbd0dc;
    $gray-400: #9aa0b4;
    $gray-600: #5a6278;
    $gray-700: #3d4358;
    $gray-800: #252b3b;

    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: $gray-50;
    }

    /* ── Hero ── */
    .hero {
      background: url('/assets/bg1.png') center/cover no-repeat;
      color: #fff;
      text-align: left;
      padding: 80px 24px 60px;
      min-height: 220px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      padding-left: 8%;
    }
    .hero h1 {
      font-size: 2.2rem;
      font-weight: 800;
      margin: 0 0 12px;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    .hero p {
      font-size: 1.1rem;
      margin: 0;
      text-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
    }

    /* ── Content ── */
    .pub-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 24px 64px;
      flex: 1;
      width: 100%;
    }

    /* ── Search Bar ── */
    .search-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 28px;
    }
    .search-bar input {
      flex: 1;
      padding: 12px 18px;
      border: 1.5px solid $gray-200;
      border-radius: 12px;
      font-size: 14px;
      background: #fff;
      transition: border-color 0.2s;
    }
    .search-bar input:focus {
      outline: none;
      border-color: $logo-red;
    }
    .result-count {
      font-size: 13px;
      color: $gray-400;
      white-space: nowrap;
    }

    .center { text-align: center; color: $gray-400; padding: 48px 0; }
    .alert.error {
      background: #fef2f2;
      color: #dc2626;
      padding: 12px 18px;
      border-radius: 10px;
      margin-bottom: 20px;
    }

    /* ── Empty state ── */
    .empty-state {
      text-align: center;
      padding: 64px 0;
      color: $gray-400;
    }
    .empty-state svg { margin-bottom: 16px; }
    .empty-state p { font-size: 15px; }

    /* ── Cards grid ── */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 24px;
    }

    .job-card {
      background: #fff;
      border: 1px solid $gray-200;
      border-radius: 16px;
      padding: 24px;
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .job-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.08);
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge-open {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      background: #dcfce7;
      color: #16a34a;
    }
    .card-date {
      font-size: 12px;
      color: $gray-400;
    }

    .card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: $gray-800;
      margin: 0;
    }
    .card-desc {
      font-size: 13.5px;
      color: $gray-600;
      line-height: 1.55;
      margin: 0;
    }

    /* ── Meta rows ── */
    .card-meta {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid $gray-100;
    }
    .meta-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      color: $gray-600;
    }
    .meta-row svg { flex-shrink: 0; }

    .pill {
      display: inline-block;
      padding: 3px 10px;
      background: #eef2ff;
      color: #4338ca;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 600;
    }
    .pill-dept {
      background: #fef3c7;
      color: #92400e;
    }
    .exp-text {
      font-size: 12.5px;
      font-weight: 600;
    }

    .btn-apply {
      display: inline-block;
      text-align: center;
      margin-top: auto;
      padding: 10px 20px;
      background: linear-gradient(135deg, $logo-red-deep, $logo-red);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.25s;
    }
    .btn-apply:hover {
      background: linear-gradient(135deg, $logo-red-mid, $logo-red-deep);
      transform: translateY(-1px);
    }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .hero h1 { font-size: 1.5rem; }
      .cards-grid { grid-template-columns: 1fr; }
      .search-bar { flex-direction: column; align-items: stretch; }
    }
  `],
})
export class PublicJobListComponent implements OnInit {
  jobs: JobPosting[] = [];
  filtered: JobPosting[] = [];
  loading = true;
  error = '';
  searchTerm = '';

  constructor(
    private jobService: JobPostingService,
    public i18n: I18nService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.jobService.getPublicJobs().subscribe({
      next: (data) => {
        this.jobs = data;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = this.i18n.t('public.loadError');
        this.loading = false;
      },
    });
  }

  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.applyFilter();
  }

  private applyFilter(): void {
    if (!this.searchTerm) {
      this.filtered = this.jobs;
      return;
    }
    const q = this.searchTerm;
    this.filtered = this.jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      (j.description || '').toLowerCase().includes(q) ||
      (j.requirements?.skillsRequired || []).some(s => s.toLowerCase().includes(q)) ||
      (j.requirements?.departments || []).some(d => d.toLowerCase().includes(q))
    );
  }
}
