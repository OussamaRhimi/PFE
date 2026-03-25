import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CandidateService, CandidateListItem } from '../../services/candidate.service';

@Component({
  selector: 'app-candidates-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <h1>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:8px">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
          Candidates
        </h1>
        <span class="count-badge" *ngIf="!loading">{{ candidates.length }} applicants</span>
      </div>

      <div class="alert error" *ngIf="error">
        {{ error }}<button (click)="error=''">&#x2715;</button>
      </div>

      <div class="skeleton-wrap" *ngIf="loading">
        <div class="skeleton-row" *ngFor="let i of [1,2,3,4,5]"></div>
      </div>

      <div class="empty" *ngIf="!loading && candidates.length === 0 && !error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd0dc" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        </svg>
        <p>No candidates yet.</p>
      </div>

      <div class="table-wrap" *ngIf="!loading && candidates.length > 0">
        <table>
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Status</th>
              <th>Score</th>
              <th>Job Posting</th>
              <th>Applied</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of candidates" [routerLink]="['/candidates', c.documentId]" class="clickable-row">
              <td>
                <div class="candidate-info">
                  <span class="avatar">{{ c.fullName.charAt(0).toUpperCase() }}</span>
                  <div>
                    <div class="name">{{ c.fullName }}</div>
                    <div class="email">{{ c.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge" [ngClass]="'badge-' + c.status">{{ c.status }}</span>
              </td>
              <td>
                <div class="score-wrap">
                  <div class="score-bar">
                    <div class="score-fill" [style.width.%]="c.score"></div>
                  </div>
                  <span class="score-num">{{ c.score | number:'1.0-0' }}</span>
                </div>
              </td>
              <td class="job-title">{{ c.jobTitle || c.jobPosting?.title || '—' }}</td>
              <td class="date-cell">{{ c.createdAt | date:'dd MMM yyyy' }}</td>
              <td class="actions-cell">
                <a [routerLink]="['/candidates', c.documentId]" class="btn-view" (click)="$event.stopPropagation()">
                  View →
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    $red: #8b1f1f;
    $red-deep: #791212;
    $gray-50: #f9fafb;
    $gray-100: #f1f3f7;
    $gray-200: #e5e8ef;
    $gray-300: #cbd0dc;
    $gray-400: #9aa0b4;
    $gray-600: #5a6278;
    $gray-700: #3d4358;
    $gray-800: #252b3b;
    $success: #16a34a;
    $warning: #d97706;
    $error: #dc2626;

    .page {
      max-width: 1200px;
      margin: 32px auto;
      padding: 0 24px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
    }
    .header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 800;
      color: $gray-800;
      display: flex;
      align-items: center;
    }

    .count-badge {
      background: rgba($red, 0.08);
      color: $red-deep;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
    }

    .alert.error {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 16px;
      background: #fff5f5;
      color: $error;
      border: 1px solid rgba($error, 0.2);
      font-size: 13.5px;
    }
    .alert button { background: none; border: none; font-size: 18px; cursor: pointer; }

    /* Skeleton */
    .skeleton-wrap { display: flex; flex-direction: column; gap: 12px; }
    .skeleton-row {
      height: 64px;
      border-radius: 12px;
      background: linear-gradient(90deg, $gray-100 25%, $gray-50 50%, $gray-100 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    /* Empty */
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 0;
      color: $gray-400;
      font-size: 14px;
    }
    .empty svg { margin-bottom: 12px; }

    /* Table */
    .table-wrap {
      overflow-x: auto;
      background: #fff;
      border-radius: 20px;
      border: 1px solid $gray-200;
      box-shadow: 0 4px 24px rgba(0,0,0,0.05);
    }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th {
      text-align: left;
      padding: 14px 18px;
      background: $gray-50;
      border-bottom: 2px solid $gray-200;
      color: $gray-400;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    td {
      padding: 14px 18px;
      border-bottom: 1px solid $gray-100;
      color: $gray-800;
      vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }

    .clickable-row {
      cursor: pointer;
      transition: background 0.15s;
    }
    .clickable-row:hover td { background: rgba($red, 0.015); }

    /* Candidate info cell */
    .candidate-info { display: flex; align-items: center; gap: 12px; }
    .avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, $red-deep, $red);
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .name { font-weight: 600; color: $gray-800; }
    .email { font-size: 12px; color: $gray-400; margin-top: 2px; }
    .job-title { color: $gray-600; font-weight: 500; }
    .date-cell { color: $gray-400; font-size: 13px; }

    /* Status badge */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .badge-new         { background: rgba(#3b82f6, 0.1); color: #1d4ed8; }
    .badge-processing  { background: rgba($warning, 0.1); color: $warning; }
    .badge-processed   { background: rgba($warning, 0.1); color: $warning; }
    .badge-reviewing   { background: rgba(#8b5cf6, 0.1); color: #6d28d9; }
    .badge-shortlisted { background: rgba($success, 0.12); color: $success; }
    .badge-rejected    { background: rgba($error, 0.1); color: $error; }
    .badge-hired       { background: rgba($success, 0.18); color: darken($success, 8%); }
    .badge-error       { background: rgba($error, 0.1); color: $error; }

    /* Score */
    .score-wrap { display: flex; align-items: center; gap: 8px; min-width: 100px; }
    .score-bar {
      flex: 1;
      height: 6px;
      background: $gray-200;
      border-radius: 3px;
      overflow: hidden;
    }
    .score-fill {
      height: 100%;
      background: linear-gradient(90deg, $red-deep, $red);
      border-radius: 3px;
      transition: width 0.4s ease;
    }
    .score-num { font-size: 12px; font-weight: 700; color: $gray-600; min-width: 28px; }

    /* View button */
    .actions-cell { white-space: nowrap; }
    .btn-view {
      display: inline-flex;
      align-items: center;
      padding: 6px 14px;
      background: rgba($red, 0.07);
      color: $red-deep;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-view:hover {
      background: rgba($red, 0.14);
      transform: translateX(2px);
    }
  `]
})
export class CandidatesListComponent implements OnInit {
  candidates: CandidateListItem[] = [];
  loading = false;
  error = '';

  constructor(private candidateService: CandidateService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.candidateService.getAllHr().subscribe({
      next: (res) => { this.candidates = res.data; this.loading = false; },
      error: () => { this.error = 'Failed to load candidates.'; this.loading = false; }
    });
  }
}
