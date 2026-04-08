import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CandidateService, AnalyticsCandidate } from '../../services/candidate.service';
import { LucideAngularModule, Pencil, Trash2, Users, TriangleAlert, Plus, Calendar } from 'lucide-angular';
import { JobPostingService, JobPosting } from '../../services/job-posting.service';
import { I18nService } from '../../services/i18n.service';

type JobMeta = {
  location: string;
  employmentType: string;
  departments: string[];
};

function toStringList(value: string): string[] {
  return value
    .split(/[,\n]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseJobNotes(notes: string | null | undefined): JobMeta {
  const meta: JobMeta = { location: '', employmentType: '', departments: [] };
  if (!notes || typeof notes !== 'string') return meta;

  const lines = notes
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const deptMatch = /^departments?\s*:\s*(.+)$/i.exec(line);
    if (deptMatch) {
      meta.departments = toStringList(deptMatch[1]);
      continue;
    }
    const locationMatch = /^location\s*:\s*(.+)$/i.exec(line);
    if (locationMatch) {
      meta.location = locationMatch[1].trim();
      continue;
    }
    const typeMatch = /^(type|employment)\s*:\s*(.+)$/i.exec(line);
    if (typeMatch) {
      meta.employmentType = typeMatch[2].trim();
    }
  }

  return meta;
}

@Component({
  selector: 'app-job-postings',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <section class="container container--wide hr-jobs-page">
      <div class="hr-jobs-head">
        <div>
          <h1>{{ i18n.t('jobs.title') }}</h1>
          <p class="muted">{{ i18n.t('jobs.subtitle') }}</p>
        </div>
        <div class="actions">
          <button class="btn btn--ghost" type="button" (click)="load()" [disabled]="loading">
            {{ i18n.t('jobs.refresh') }}
          </button>
          <a routerLink="/job-postings/new" class="btn btn--primary hr-jobs-create-btn">
            <lucide-angular [img]="icons.plus" [size]="18" aria-hidden="true"></lucide-angular>
            <span>{{ i18n.t('jobs.new') }}</span>
          </a>
        </div>
      </div>

      <div class="alert alert--error" *ngIf="error">{{ error }}</div>
      <div class="alert alert--success" *ngIf="success">{{ success }}</div>

      <div class="hr-jobs-list">
        <ng-container *ngIf="loading; else jobsReady">
          <div class="card skeleton" style="height: 180px"></div>
          <div class="card skeleton" style="height: 180px"></div>
        </ng-container>

        <ng-template #jobsReady>
          <div class="alert" *ngIf="jobs.length === 0">{{ i18n.t('jobs.empty') }}</div>

          <article class="card hr-job-card" *ngFor="let job of jobs">
            <div class="hr-job-card__top">
              <div class="truncate">
                <h2 class="hr-job-card__title">{{ job.title || i18n.t('jobs.untitled') }}</h2>
                <div class="hr-job-meta">
                  <span>{{ jobDepartments(job) }}</span>
                  <span>&middot;</span>
                  <span>{{ jobLocation(job) }}</span>
                  <span>&middot;</span>
                  <span>{{ jobEmploymentType(job) }}</span>
                </div>
              </div>
              <span [class]="statusClass(job.status)">{{ statusLabel(job.status) }}</span>
            </div>

            <div class="hr-job-card__mid">
              <div>
                <h3>{{ i18n.t('jobs.requiredSkills') }}</h3>
                <div class="hr-job-skills">
                  <ng-container *ngIf="(job.requirements?.skillsRequired || []).length > 0; else noSkills">
                    <span class="hr-job-skill" *ngFor="let skill of job.requirements?.skillsRequired || []">{{ skill }}</span>
                  </ng-container>
                  <ng-template #noSkills>
                    <span class="muted small">{{ i18n.t('jobs.notSpecified') }}</span>
                  </ng-template>
                </div>
              </div>
              <div>
                <h3>{{ i18n.t('jobs.experienceRequired') }}</h3>
                <p class="hr-job-experience">{{ jobExperience(job) }}</p>
              </div>
            </div>

            <div class="hr-job-card__bottom">
              <div class="hr-job-stats">
                <span>
                  <lucide-angular [img]="icons.candidates" [size]="15" aria-hidden="true"></lucide-angular>
                  {{ applicantCount(job) }} {{ i18n.t('jobs.applicants') }}
                </span>
                <span>
                  <lucide-angular [img]="icons.calendar" [size]="15" aria-hidden="true"></lucide-angular>
                  {{ i18n.t('jobs.posted') }} {{ postedDate(job) }}
                </span>
              </div>

              <div class="hr-job-actions">
                <select
                  class="input input--sm"
                  [value]="job.status || 'draft'"
                  (change)="setStatus(job, $any($event.target).value)"
                  [disabled]="loading"
                >
                  <option value="draft">{{ i18n.t('jobs.statusDraft') }}</option>
                  <option value="open">{{ i18n.t('jobs.statusOpen') }}</option>
                  <option value="closed">{{ i18n.t('jobs.statusClosed') }}</option>
                </select>

                <button class="btn btn--ghost hr-job-icon-btn" type="button" (click)="goToCandidates(job.documentId)">
                  <lucide-angular [img]="icons.candidates" [size]="16" aria-hidden="true"></lucide-angular>
                </button>
                <a [routerLink]="['/job-postings', job.documentId, 'edit']" class="btn btn--ghost hr-job-icon-btn" [title]="i18n.t('jobs.editTooltip')">
                  <lucide-angular [img]="icons.edit" [size]="16" aria-hidden="true"></lucide-angular>
                </a>
                <button class="btn btn--ghost hr-job-icon-btn hr-job-icon-btn--danger" type="button" (click)="askDelete(job)" [title]="i18n.t('jobs.deleteTooltip')">
                  <lucide-angular [img]="icons.delete" [size]="16" aria-hidden="true"></lucide-angular>
                </button>
              </div>
            </div>
          </article>
        </ng-template>
      </div>
    </section>

    <div class="modal-overlay" *ngIf="statusConfirm" (click)="cancelStatusChange()">
      <div class="modal card" (click)="$event.stopPropagation()">
        <h3>{{ i18n.t('jobs.confirmStatusTitle') }}</h3>
        <p>{{ i18n.t('jobs.confirmStatusText') }} <strong>{{ statusConfirm.job.title }}</strong>
           {{ i18n.t('jobs.from') }} <span class="badge" [ngClass]="'badge-' + statusConfirm.job.status">{{ statusConfirm.job.status }}</span>
           {{ i18n.t('jobs.to') }} <span class="badge" [ngClass]="'badge-' + statusConfirm.newStatus">{{ statusConfirm.newStatus }}</span> ?
        </p>
        <div class="modal-actions">
          <button class="btn btn--primary" (click)="confirmStatusChange()">{{ i18n.t('jobs.confirm') }}</button>
          <button class="btn btn--ghost" (click)="cancelStatusChange()">{{ i18n.t('jobs.cancel') }}</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" *ngIf="deleteConfirm" (click)="cancelDelete()">
      <div class="modal card modal-danger" (click)="$event.stopPropagation()">
        <h3>{{ i18n.t('jobs.deleteTitle') }}</h3>
        <p>{{ i18n.t('jobs.deleteText') }} <strong>{{ deleteConfirm.job.title }}</strong> ?</p>
        <div class="cascade-warning" *ngIf="deleteConfirm.candidateCount > 0">
          <lucide-angular class="warning-icon" [img]="icons.warning" [size]="16" aria-hidden="true"></lucide-angular>
          {{ i18n.t('jobs.cascadeWarning') }}
          <strong>{{ deleteConfirm.candidateCount }}</strong>
          {{ i18n.t('jobs.candidates') }}
        </div>
        <p class="danger-text">{{ i18n.t('jobs.undoWarning') }}</p>
        <div class="modal-actions">
          <button class="btn btn--danger" (click)="confirmDelete()">{{ i18n.t('jobs.delete') }}</button>
          <button class="btn btn--ghost" (click)="cancelDelete()">{{ i18n.t('jobs.cancel') }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --bg: #f6f7f9;
      --panel: #ffffff;
      --panel-2: #f3f4f6;
      --border: #e5e7eb;
      --border-2: #d1d5db;
      --text: #111827;
      --muted: #6b7280;
      --shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      --accent: #dc2626;
      --accent-2: #b91c1c;
      --danger: #dc2626;
      --ok: #16a34a;
      --hover: #f3f4f6;
      --input-bg: #ffffff;
      --input-border: #d1d5db;
      --accent-soft-bg: rgba(220, 38, 38, 0.1);
      --accent-soft-border: rgba(220, 38, 38, 0.35);
      --danger-soft-bg: rgba(220, 38, 38, 0.1);
      --danger-soft-border: rgba(220, 38, 38, 0.45);
      --ok-soft-bg: rgba(22, 163, 74, 0.1);
      --ok-soft-border: rgba(22, 163, 74, 0.35);
      --focus-ring: rgba(220, 38, 38, 0.18);
      display: block;
      color: var(--text);
    }

    .container {
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding-inline: 16px;
      box-sizing: border-box;
    }

    .container--wide {
      max-width: 1200px;
    }

    .hr-jobs-page {
      display: grid;
      gap: 14px;
      padding: 24px 0 50px;
    }

    .hr-jobs-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }

    h1 {
      margin: 0 0 6px;
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--text);
    }

    .muted {
      color: var(--muted);
    }

    .small {
      font-size: 12px;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }

    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      box-shadow: var(--shadow);
    }

    .btn {
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      border-radius: 12px;
      padding: 9px 12px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .btn:hover {
      border-color: var(--border-2);
    }

    .btn:not(.btn--primary):not(.btn--danger):hover {
      background: var(--hover);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn--primary {
      border-color: var(--accent);
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #ffffff;
    }

    .btn--ghost {
      background: transparent;
    }

    .btn--danger {
      border-color: var(--danger-soft-border);
      background: var(--danger-soft-bg);
    }

    .btn--danger:hover {
      filter: brightness(1.03);
    }

    .input {
      width: 100%;
      border-radius: 10px;
      border: 1px solid var(--input-border);
      background: var(--input-bg);
      color: var(--text);
      padding: 10px 12px;
      outline: none;
    }

    .input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--focus-ring);
    }

    .input--sm {
      padding: 7px 10px;
      border-radius: 10px;
      font-size: 12px;
    }

    .alert {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 10px;
      padding: 10px 12px;
      margin-top: 12px;
    }

    .alert--error {
      border-color: var(--danger-soft-border);
      background: var(--danger-soft-bg);
    }

    .alert--success {
      border-color: var(--ok-soft-border);
      background: var(--ok-soft-bg);
    }

    .skeleton {
      border-radius: 10px;
      background: linear-gradient(90deg, var(--panel-2), var(--hover), var(--panel-2));
      background-size: 200% 100%;
      animation: shimmer 1.2s infinite;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .truncate {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hr-jobs-list {
      display: grid;
      gap: 14px;
    }

    .hr-job-card {
      padding: 22px;
      border-radius: 14px;
    }

    .hr-job-card__top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 12px;
    }

    .hr-job-card__title {
      font-size: 1.25rem;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }

    .hr-job-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 8px;
      color: var(--muted);
      flex-wrap: wrap;
    }

    .hr-job-status {
      border-radius: 999px;
      padding: 8px 14px;
      font-size: 13px;
      border: 1px solid var(--border);
      font-weight: 700;
    }

    .hr-job-status--open {
      background: #dcfce7;
      border-color: #86efac;
      color: #166534;
    }

    .hr-job-status--closed {
      background: #fee2e2;
      border-color: #fca5a5;
      color: #991b1b;
    }

    .hr-job-status--draft {
      background: var(--panel-2);
      border-color: var(--border);
      color: var(--muted);
    }

    .hr-job-card__mid {
      display: grid;
      gap: 16px;
      grid-template-columns: 1fr;
      margin-bottom: 14px;
    }

    .hr-job-card__mid h3 {
      font-size: 22px;
      margin-bottom: 10px;
      letter-spacing: -0.01em;
    }

    .hr-job-skills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .hr-job-skill {
      display: inline-flex;
      align-items: center;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 0.82rem;
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .hr-job-experience {
      margin-top: 4px;
      font-size: 0.95rem;
      color: var(--text);
    }

    .hr-job-card__bottom {
      border-top: 1px solid var(--border);
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .hr-job-stats {
      display: flex;
      align-items: center;
      gap: 18px;
      color: var(--muted);
      flex-wrap: wrap;
    }

    .hr-job-stats span {
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }

    .hr-job-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hr-job-icon-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      justify-content: center;
      padding: 0;
    }

    .hr-job-icon-btn--danger {
      color: var(--danger);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 6px 10px;
      border: 1px solid var(--border);
      background: var(--panel);
      font-size: 12px;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 14, 25, 0.58);
      display: grid;
      place-items: center;
      z-index: 50;
      padding: 20px;
    }

    .modal {
      width: min(440px, 100%);
      padding: 24px;
    }

    .modal h3 {
      margin: 0 0 14px;
      font-size: 18px;
      color: var(--text);
      font-weight: 700;
    }

    .modal p {
      margin: 0 0 12px;
      font-size: 14px;
      color: var(--muted);
    }

    .modal-danger h3 {
      color: var(--danger);
    }

    .cascade-warning {
      background: #fffbeb;
      border: 1px solid #fbbf24;
      color: #92400e;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 13px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .warning-icon {
      flex: 0 0 auto;
      width: 16px;
      height: 16px;
    }

    .danger-text {
      color: var(--danger);
      font-weight: 600;
      font-size: 13px;
    }

    .modal-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    @media (min-width: 960px) {
      .hr-job-card__mid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 760px) {
      .hr-job-card {
        padding: 16px;
      }

      .hr-job-card__title {
        font-size: 28px;
      }

      .hr-job-card__mid h3 {
        font-size: 18px;
      }

      .hr-job-skill {
        font-size: 14px;
      }

      .hr-job-experience {
        font-size: 22px;
      }
    }
  `]
})
export class JobPostingsComponent implements OnInit {
  jobs: JobPosting[] = [];
  candidateCounts: Record<string, number> = {};
  loading = false;
  error = '';
  success = '';
  readonly icons = {
    edit: Pencil,
    delete: Trash2,
    candidates: Users,
    warning: TriangleAlert,
    plus: Plus,
    calendar: Calendar
  } as const;

  statusConfirm: { job: JobPosting; newStatus: string } | null = null;
  deleteConfirm: { job: JobPosting; candidateCount: number } | null = null;

  constructor(
    private jobService: JobPostingService,
    private candidateService: CandidateService,
    public i18n: I18nService,
    private router: Router
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.jobService.getAll().subscribe({
      next: (jobs) => {
        this.jobs = jobs;
        this.loading = false;
        this.loadCandidateCounts();
      },
      error: () => { this.error = this.i18n.t('jobs.loadError'); this.loading = false; }
    });
  }

  private loadCandidateCounts(): void {
    this.candidateService.listForAnalytics().subscribe({
      next: (candidates: AnalyticsCandidate[]) => {
        const map: Record<string, number> = {};
        for (const candidate of candidates) {
          const key = candidate.jobKey;
          if (!key) continue;
          map[key] = (map[key] ?? 0) + 1;
        }
        this.candidateCounts = map;
      },
      error: () => {
        this.candidateCounts = {};
      }
    });
  }

  askStatusChange(job: JobPosting, newStatus: string): void {
    this.statusConfirm = { job, newStatus };
  }

  cancelStatusChange(): void { this.statusConfirm = null; }

  confirmStatusChange(): void {
    if (!this.statusConfirm) return;
    const { job, newStatus } = this.statusConfirm;
    this.statusConfirm = null;
    this.clearMessages();

    this.jobService.changeStatus(job.documentId, newStatus).subscribe({
      next: (updated) => {
        const i = this.jobs.findIndex(j => j.documentId === job.documentId);
        if (i !== -1) this.jobs[i] = { ...this.jobs[i], ...updated };
        this.success = `"${job.title}" ${this.i18n.t('jobs.statusChanged')} ${newStatus}.`;
        this.autoClear();
      },
      error: (err) => {
        this.error = err?.error?.error?.message || this.i18n.t('jobs.statusError');
      }
    });
  }

  askDelete(job: JobPosting): void {
    this.clearMessages();
    this.jobService.getCandidateCount(job.documentId).subscribe({
      next: (count) => { this.deleteConfirm = { job, candidateCount: count }; },
      error: () => { this.deleteConfirm = { job, candidateCount: 0 }; }
    });
  }

  cancelDelete(): void { this.deleteConfirm = null; }

  confirmDelete(): void {
    if (!this.deleteConfirm) return;
    const { job } = this.deleteConfirm;
    this.deleteConfirm = null;
    this.clearMessages();

    this.jobService.delete(job.documentId).subscribe({
      next: () => {
        this.jobs = this.jobs.filter(j => j.documentId !== job.documentId);
        this.success = `"${job.title}" ${this.i18n.t('jobs.deleted')}`;
        this.autoClear();
      },
      error: () => { this.error = this.i18n.t('jobs.deleteError'); }
    });
  }

  private clearMessages(): void { this.error = ''; this.success = ''; }
  private autoClear(): void { setTimeout(() => this.success = '', 3000); }

  goToCandidates(documentId: string): void {
    if (documentId) {
      this.router.navigate(['/candidates'], { queryParams: { jobPostingId: documentId } });
    }
  }

  setStatus(job: JobPosting, newStatus: string): void {
    if (!job || !newStatus || newStatus === job.status) return;
    this.askStatusChange(job, newStatus);
  }

  statusClass(status: string | null | undefined): string {
    const value = status || 'draft';
    return `hr-job-status hr-job-status--${value}`;
  }

  statusLabel(status: string | null | undefined): string {
    const value = status || 'draft';
    if (value === 'open') return this.i18n.t('jobs.statusOpen');
    if (value === 'closed') return this.i18n.t('jobs.statusClosed');
    return this.i18n.t('jobs.statusDraft');
  }

  jobDepartments(job: JobPosting): string {
    const departments = job.requirements?.departments || [];
    if (departments.length > 0) return departments.join(', ');
    const meta = parseJobNotes(job.requirements?.notes);
    return meta.departments.length > 0 ? meta.departments.join(', ') : this.i18n.t('jobs.notSpecified');
  }

  jobLocation(job: JobPosting): string {
    const meta = parseJobNotes(job.requirements?.notes);
    return meta.location ? meta.location : this.i18n.t('jobs.notSpecified');
  }

  jobEmploymentType(job: JobPosting): string {
    const meta = parseJobNotes(job.requirements?.notes);
    return meta.employmentType ? meta.employmentType : this.i18n.t('jobs.notSpecified');
  }

  jobExperience(job: JobPosting): string {
    const years = job.requirements?.minYearsExperience;
    if (typeof years === 'number' && years > 0) {
      return `${years}+ ${this.i18n.t('jobs.years')}`;
    }
    return this.i18n.t('jobs.notSpecified');
  }

  postedDate(job: JobPosting): string {
    const raw = job.createdAt ? new Date(job.createdAt) : null;
    if (!raw || Number.isNaN(raw.getTime())) return this.i18n.t('jobs.notSpecified');
    return raw.toISOString().slice(0, 10);
  }

  applicantCount(job: JobPosting): number {
    if (!job.documentId) return 0;
    return this.candidateCounts[job.documentId] ?? 0;
  }
}
