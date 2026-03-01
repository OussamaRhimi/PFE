import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { JobPostingService, JobPosting } from '../../services/job-posting.service';

@Component({
  selector: 'app-job-postings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <h1>Job Postings</h1>
        <a routerLink="/job-postings/new" class="btn-add">+ New Job Posting</a>
      </div>

      <div class="alert error" *ngIf="error">{{ error }}<button (click)="error=''">&times;</button></div>
      <div class="alert success" *ngIf="success">{{ success }}<button (click)="success=''">&times;</button></div>

      <p class="center" *ngIf="loading">Loading...</p>
      <p class="center" *ngIf="!loading && jobs.length === 0">No job postings yet.</p>

      <!-- Status toggle confirmation dialog -->
      <div class="modal-overlay" *ngIf="statusConfirm" (click)="cancelStatusChange()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Confirm Status Change</h3>
          <p>Change status of <strong>{{ statusConfirm.job.title }}</strong>
             from <span class="badge" [ngClass]="'badge-' + statusConfirm.job.status">{{ statusConfirm.job.status }}</span>
             to <span class="badge" [ngClass]="'badge-' + statusConfirm.newStatus">{{ statusConfirm.newStatus }}</span>?
          </p>
          <div class="modal-actions">
            <button class="btn-confirm" (click)="confirmStatusChange()">Confirm</button>
            <button class="btn-cancel" (click)="cancelStatusChange()">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Delete confirmation dialog with cascade warning -->
      <div class="modal-overlay" *ngIf="deleteConfirm" (click)="cancelDelete()">
        <div class="modal modal-danger" (click)="$event.stopPropagation()">
          <h3>Delete Job Posting</h3>
          <p>Are you sure you want to delete <strong>{{ deleteConfirm.job.title }}</strong>?</p>
          <div class="cascade-warning" *ngIf="deleteConfirm.candidateCount > 0">
            ⚠️ This will also permanently delete
            <strong>{{ deleteConfirm.candidateCount }}</strong>
            candidate{{ deleteConfirm.candidateCount > 1 ? 's' : '' }}
            and their resume files.
          </div>
          <p class="danger-text">This action cannot be undone.</p>
          <div class="modal-actions">
            <button class="btn-delete" (click)="confirmDelete()">Delete</button>
            <button class="btn-cancel" (click)="cancelDelete()">Cancel</button>
          </div>
        </div>
      </div>

      <div class="table-wrap" *ngIf="!loading && jobs.length > 0">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Skills Required</th>
              <th>Departments</th>
              <th>Actions</th>
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
                <a [routerLink]="['/job-postings', job.documentId, 'edit']" class="btn-icon" title="Edit">✏️</a>

                <!-- Status transitions -->
                <button *ngIf="job.status === 'draft'" class="btn-sm btn-open" (click)="askStatusChange(job, 'open')">Open</button>
                <button *ngIf="job.status === 'open'" class="btn-sm btn-close" (click)="askStatusChange(job, 'closed')">Close</button>
                <button *ngIf="job.status === 'closed'" class="btn-sm btn-reopen" (click)="askStatusChange(job, 'open')">Reopen</button>

                <button class="btn-icon btn-del" (click)="askDelete(job)" title="Delete">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 30px auto; padding: 0 20px; font-family: 'Segoe UI', sans-serif; }

    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; color: #333; }

    .btn-add {
      text-decoration: none; padding: 10px 20px; background: #4f46e5; color: #fff;
      border-radius: 6px; font-size: 14px;
    }
    .btn-add:hover { background: #4338ca; }

    .alert { display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 14px; }
    .alert button { background: none; border: none; font-size: 18px; cursor: pointer; }
    .alert.error { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
    .alert.success { background: #dcfce7; color: #16a34a; border: 1px solid #86efac; }

    .center { text-align: center; color: #888; padding: 30px 0; }

    /* Table */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 12px; background: #f9fafb; border-bottom: 2px solid #e5e7eb; color: #555; font-weight: 600; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; color: #333; }
    tr:hover td { background: #f9fafb; }
    .title-cell { font-weight: 500; }

    .actions-cell { white-space: nowrap; display: flex; align-items: center; gap: 6px; }
    .btn-icon { background: none; border: none; font-size: 16px; cursor: pointer; text-decoration: none; }
    .btn-del:hover { transform: scale(1.15); }

    .btn-sm {
      padding: 4px 10px; border: none; border-radius: 4px; font-size: 12px;
      cursor: pointer; font-weight: 500;
    }
    .btn-open   { background: #dcfce7; color: #16a34a; }
    .btn-open:hover { background: #86efac; }
    .btn-close  { background: #fee2e2; color: #dc2626; }
    .btn-close:hover { background: #fca5a5; }
    .btn-reopen { background: #e0e7ff; color: #4f46e5; }
    .btn-reopen:hover { background: #c7d2fe; }

    /* Badges */
    .badge {
      display: inline-block; padding: 3px 10px; border-radius: 12px;
      font-size: 12px; font-weight: 600; text-transform: uppercase;
    }
    .badge-draft  { background: #f3f4f6; color: #6b7280; }
    .badge-open   { background: #dcfce7; color: #16a34a; }
    .badge-closed { background: #fee2e2; color: #dc2626; }

    /* Pill tags for skills / departments */
    .pill {
      display: inline-block; padding: 2px 8px; margin: 1px 3px; border-radius: 10px;
      font-size: 11px; font-weight: 500; background: #e0e7ff; color: #4338ca;
    }
    .pill-dept { background: #dcfce7; color: #166534; }

    /* Modals */
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.4); z-index: 1000;
      display: flex; align-items: center; justify-content: center;
    }
    .modal {
      background: #fff; border-radius: 10px; padding: 28px; width: 90%;
      max-width: 440px; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
    }
    .modal h3 { margin: 0 0 14px; font-size: 18px; color: #333; }
    .modal p { margin: 0 0 12px; font-size: 14px; color: #555; }
    .modal-danger h3 { color: #dc2626; }

    .cascade-warning {
      background: #fef3c7; border: 1px solid #fbbf24; color: #92400e;
      padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 12px;
    }
    .danger-text { color: #dc2626; font-weight: 500; font-size: 13px; }

    .modal-actions { display: flex; gap: 10px; margin-top: 18px; }
    .modal-actions button { flex: 1; padding: 10px; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 500; }
    .btn-confirm { background: #4f46e5; color: #fff; }
    .btn-confirm:hover { background: #4338ca; }
    .btn-delete { background: #dc2626; color: #fff; }
    .btn-delete:hover { background: #b91c1c; }
    .btn-cancel { background: #f3f4f6; color: #666; }
    .btn-cancel:hover { background: #e5e7eb; }
  `]
})
export class JobPostingsComponent implements OnInit {
  jobs: JobPosting[] = [];
  loading = false;
  error = '';
  success = '';

  statusConfirm: { job: JobPosting; newStatus: string } | null = null;
  deleteConfirm: { job: JobPosting; candidateCount: number } | null = null;

  constructor(private jobService: JobPostingService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.jobService.getAll().subscribe({
      next: (jobs) => { this.jobs = jobs; this.loading = false; },
      error: () => { this.error = 'Failed to load job postings.'; this.loading = false; }
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
        this.success = `"${job.title}" status changed to ${newStatus}.`;
        this.autoClear();
      },
      error: (err) => {
        this.error = err?.error?.error?.message || 'Failed to change status.';
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
        this.success = `"${job.title}" deleted.`;
        this.autoClear();
      },
      error: () => { this.error = 'Failed to delete job posting.'; }
    });
  }

  private clearMessages(): void { this.error = ''; this.success = ''; }
  private autoClear(): void { setTimeout(() => this.success = '', 3000); }
}
