import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { JobPostingService, JobPosting } from '../../services/job-posting.service';
import { I18nService } from '../../services/i18n.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-job-postings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <h1>{{ i18n.t('jobs.title') }}</h1>
        <a routerLink="/job-postings/new" class="btn-add">{{ i18n.t('jobs.new') }}</a>
      </div>

      <div class="alert error" *ngIf="error">{{ error }}<button (click)="error=''">&times;</button></div>
      <div class="alert success" *ngIf="success">{{ success }}<button (click)="success=''">&times;</button></div>

      <p class="center" *ngIf="loading">{{ i18n.t('jobs.loading') }}</p>
      <p class="center" *ngIf="!loading && jobs.length === 0">{{ i18n.t('jobs.empty') }}</p>

      <!-- Status toggle confirmation dialog -->
      <div class="modal-overlay" *ngIf="statusConfirm" (click)="cancelStatusChange()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ i18n.t('jobs.confirmStatusTitle') }}</h3>
          <p>{{ i18n.t('jobs.confirmStatusText') }} <strong>{{ statusConfirm.job.title }}</strong>
             {{ i18n.t('jobs.from') }} <span class="badge" [ngClass]="'badge-' + statusConfirm.job.status">{{ statusConfirm.job.status }}</span>
             {{ i18n.t('jobs.to') }} <span class="badge" [ngClass]="'badge-' + statusConfirm.newStatus">{{ statusConfirm.newStatus }}</span> ?
          </p>
          <div class="modal-actions">
            <button class="btn-confirm" (click)="confirmStatusChange()">{{ i18n.t('jobs.confirm') }}</button>
            <button class="btn-cancel" (click)="cancelStatusChange()">{{ i18n.t('jobs.cancel') }}</button>
          </div>
        </div>
      </div>

      <!-- Delete confirmation dialog with cascade warning -->
      <div class="modal-overlay" *ngIf="deleteConfirm" (click)="cancelDelete()">
        <div class="modal modal-danger" (click)="$event.stopPropagation()">
          <h3>{{ i18n.t('jobs.deleteTitle') }}</h3>
          <p>{{ i18n.t('jobs.deleteText') }} <strong>{{ deleteConfirm.job.title }}</strong> ?</p>
          <div class="cascade-warning" *ngIf="deleteConfirm.candidateCount > 0">
            ⚠️ {{ i18n.t('jobs.cascadeWarning') }}
            <strong>{{ deleteConfirm.candidateCount }}</strong>
            {{ i18n.t('jobs.candidates') }}
          </div>
          <p class="danger-text">{{ i18n.t('jobs.undoWarning') }}</p>
          <div class="modal-actions">
            <button class="btn-delete" (click)="confirmDelete()">{{ i18n.t('jobs.delete') }}</button>
            <button class="btn-cancel" (click)="cancelDelete()">{{ i18n.t('jobs.cancel') }}</button>
          </div>
        </div>
      </div>

      <div class="table-wrap" *ngIf="!loading && jobs.length > 0">
        <table>
          <thead>
            <tr>
              <th>{{ i18n.t('jobs.colTitle') }}</th>
              <th>{{ i18n.t('jobs.colStatus') }}</th>
              <th>{{ i18n.t('jobs.colSkills') }}</th>
              <th>{{ i18n.t('jobs.colDepts') }}</th>
              <th>{{ i18n.t('jobs.colActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let job of jobs">
              <td class="title-cell">{{ job.title }}</td>
              <td>
                <span class="badge" [ngClass]="'badge-' + job.status">{{ job.status }}</span>
              </td>
              <td>
                <span class="pill" *ngFor="let s of job.requirements?.skillsRequired || []">{{ s }}</span>
                <span *ngIf="!(job.requirements?.skillsRequired?.length)">—</span>
              </td>
              <td>
                <span class="pill pill-dept" *ngFor="let d of job.requirements?.departments || []">{{ d }}</span>
                <span *ngIf="!(job.requirements?.departments?.length)">—</span>
              </td>
              <td class="actions-cell">
                <a [routerLink]="['/job-postings', job.documentId, 'edit']" class="btn-icon" [title]="i18n.t('jobs.editTooltip')">✏️</a>

                <!-- Status transitions -->
                <button *ngIf="job.status === 'draft'" class="btn-sm btn-open" (click)="askStatusChange(job, 'open')">{{ i18n.t('jobs.open') }}</button>
                <button *ngIf="job.status === 'open'" class="btn-sm btn-close" (click)="askStatusChange(job, 'closed')">{{ i18n.t('jobs.close') }}</button>
                <button *ngIf="job.status === 'closed'" class="btn-sm btn-reopen" (click)="askStatusChange(job, 'open')">{{ i18n.t('jobs.reopen') }}</button>

                <button class="btn-icon btn-del" (click)="askDelete(job)" [title]="i18n.t('jobs.deleteTooltip')">🗑️</button>
                <button class="btn-sm btn-candidates" 
                        (click)="goToCandidates(job.documentId)"
                        [title]="i18n.t('jobs.viewCandidatesTooltip')">
                  👥 {{ i18n.t('form.list') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    $logo-red: #8b1f1f;
    $logo-red-mid: #a31a1a;
    $logo-red-deep: #791212;
    $logo-red-darker: #5f1010;
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

    .page {
      max-width: 1100px;
      margin: 32px auto;
      padding: 0 24px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
    }
    .header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 800;
      color: $gray-800;
    }

    .btn-add {
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 22px;
      background: linear-gradient(135deg, $logo-red-deep, $logo-red);
      color: #fff;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.25s;
      box-shadow: 0 4px 14px rgba($logo-red, 0.2);
    }
    .btn-add:hover {
      background: linear-gradient(135deg, $logo-red-mid, $logo-red-deep);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba($logo-red, 0.3);
    }

    .alert {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 16px;
      font-size: 13.5px;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    }
    .alert button { background: none; border: none; font-size: 18px; cursor: pointer; }
    .alert.error { background: #fff5f5; color: $error; border: 1px solid rgba($error, 0.2); }
    .alert.success { background: #f0fdf4; color: $success; border: 1px solid rgba($success, 0.2); }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .center { text-align: center; color: $gray-400; padding: 30px 0; font-size: 14px; }

    /* Table */
    .table-wrap {
      overflow-x: auto;
      background: white;
      border-radius: 16px;
      border: 1px solid $gray-200;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th {
      text-align: left;
      padding: 14px 16px;
      background: $gray-50;
      border-bottom: 2px solid $gray-200;
      color: $gray-400;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    td {
      padding: 14px 16px;
      border-bottom: 1px solid $gray-100;
      color: $gray-800;
    }
    tr:hover td { background: rgba($logo-red, 0.015); }
    tr:last-child td { border-bottom: none; }
    .title-cell { font-weight: 600; }

    .actions-cell { white-space: nowrap; display: flex; align-items: center; gap: 6px; }
    .btn-icon {
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      text-decoration: none;
      transition: transform 0.15s;
    }
    .btn-del:hover { transform: scale(1.15); }

    .btn-sm {
      padding: 5px 12px;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-open   { background: rgba($success, 0.08); color: $success; }
    .btn-open:hover { background: rgba($success, 0.15); }
    .btn-close  { background: rgba($error, 0.08); color: $error; }
    .btn-close:hover { background: rgba($error, 0.15); }
    .btn-reopen { background: rgba($logo-red, 0.08); color: $logo-red; }
    .btn-reopen:hover { background: rgba($logo-red, 0.15); }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-draft  { background: $gray-100; color: $gray-400; }
    .badge-open   { background: rgba($success, 0.1); color: $success; }
    .badge-closed { background: rgba($error, 0.1); color: $error; }

    /* Pill tags for skills / departments */
    .pill {
      display: inline-block;
      padding: 3px 10px;
      margin: 2px 3px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 600;
      background: rgba($logo-red, 0.07);
      color: $logo-red-deep;
    }
    .pill-dept {
      background: rgba(#166534, 0.07);
      color: #166534;
    }

    /* Modals */
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.35);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .modal {
      background: #fff;
      border-radius: 20px;
      padding: 32px;
      width: 90%;
      max-width: 440px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      animation: modalIn 0.25s cubic-bezier(0.22, 1, 0.36, 1);
    }
    @keyframes modalIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .modal h3 { margin: 0 0 14px; font-size: 18px; color: $gray-800; font-weight: 700; }
    .modal p { margin: 0 0 12px; font-size: 14px; color: $gray-600; }
    .modal-danger h3 { color: $error; }

    .cascade-warning {
      background: #fffbeb;
      border: 1px solid #fbbf24;
      color: #92400e;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 13px;
      margin-bottom: 12px;
    }
    .danger-text { color: $error; font-weight: 600; font-size: 13px; }

    .modal-actions { display: flex; gap: 10px; margin-top: 20px; }
    .modal-actions button {
      flex: 1;
      padding: 11px;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-confirm {
      background: linear-gradient(135deg, $logo-red-deep, $logo-red);
      color: #fff;
      box-shadow: 0 4px 12px rgba($logo-red, 0.2);
    }
    .btn-confirm:hover {
      box-shadow: 0 6px 18px rgba($logo-red, 0.3);
      transform: translateY(-1px);
    }
    .btn-delete {
      background: linear-gradient(135deg, #b91c1c, $error);
      color: #fff;
      box-shadow: 0 4px 12px rgba($error, 0.2);
    }
    .btn-delete:hover { box-shadow: 0 6px 18px rgba($error, 0.3); }
    .btn-cancel { background: $gray-100; color: $gray-600; }
    .btn-cancel:hover { background: $gray-200; }
  `]
})
export class JobPostingsComponent implements OnInit {
  jobs: JobPosting[] = [];
  loading = false;
  error = '';
  success = '';

  statusConfirm: { job: JobPosting; newStatus: string } | null = null;
  deleteConfirm: { job: JobPosting; candidateCount: number } | null = null;

  constructor(private jobService: JobPostingService, public i18n: I18nService,private router: Router) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.jobService.getAll().subscribe({
      next: (jobs) => { this.jobs = jobs; this.loading = false; },
      error: () => { this.error = this.i18n.t('jobs.loadError'); this.loading = false; }
    });
  }

  /* ── Status change ── */
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

  /* ── Delete with cascade warning ── */
  askDelete(job: JobPosting): void {
    this.clearMessages();
    // Try to get candidate count for cascade warning
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
  
}
