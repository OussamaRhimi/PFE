import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CandidateService, CandidateListItem } from '../../services/candidate.service';
import { JobPostingService, JobPosting } from '../../services/job-posting.service';

@Component({
  selector: 'app-candidates-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
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
        <span class="count-badge" *ngIf="!loading && totalCount > 0">{{ totalCount }} applicants</span>
      </div>

      <!-- Filters row -->
      <div class="filters-row">
        <div class="search-box">
          <select class="search-field-filter" [(ngModel)]="searchField" (change)="applyFilters()">
            <option *ngFor="let option of searchFieldOptions" [value]="option.value">{{ option.label }}</option>
          </select>
          <div class="search-divider" aria-hidden="true"></div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="applyFilters()"
            [placeholder]="getSearchPlaceholder()"
          />
        </div>
        <select class="status-filter" [(ngModel)]="statusFilter" (change)="applyFilters()">
          <option value="">All statuses</option>
          <option *ngFor="let s of statusOptions" [value]="s">{{ s }}</option>
        </select>
        <select class="job-filter" [(ngModel)]="jobPostingFilter" (change)="applyFilters()">
          <option value="">All job postings</option>
          <option *ngFor="let job of jobPostings" [value]="job.documentId">{{ job.title }}</option>
        </select>
        <div class="score-filter">
          <label class="score-toggle">
            <input type="checkbox" [(ngModel)]="scoreFilterEnabled" (change)="applyFilters()" />
            <span>Score</span>
          </label>
          <select
            class="score-operator"
            [(ngModel)]="scoreOperator"
            (change)="applyFilters()"
            [disabled]="!scoreFilterEnabled"
          >
            <option value="gt">Above</option>
            <option value="lt">Below</option>
          </select>
          <input
            type="range"
            class="score-slider"
            min="0"
            max="100"
            step="1"
            [(ngModel)]="scoreThreshold"
            (input)="applyFilters()"
            [disabled]="!scoreFilterEnabled"
          />
          <span class="score-unit">{{ scoreThreshold }}%</span>
        </div>
      </div>

      <div class="bulk-toolbar" *ngIf="candidates.length > 0">
        <div class="bulk-info">{{ selectedCandidateIds.length }} selected</div>
        <div class="bulk-actions">
          <button class="bulk-btn" type="button" (click)="selectAllCurrent()" [disabled]="loading">Select page</button>
          <button class="bulk-btn" type="button" (click)="clearSelection()" [disabled]="loading || selectedCandidateIds.length === 0">Clear</button>
          <select class="bulk-select" [(ngModel)]="bulkStatus" [disabled]="loading || selectedCandidateIds.length === 0">
            <option value="">Set status...</option>
            <option *ngFor="let s of statusOptions" [value]="s">{{ s }}</option>
          </select>
          <button
            class="bulk-btn bulk-btn-primary"
            type="button"
            (click)="applyBulkStatus()"
            [disabled]="loading || selectedCandidateIds.length === 0 || !bulkStatus"
          >
            Apply
          </button>
        </div>
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
              <th class="select-col">
                <input
                  type="checkbox"
                  [checked]="allCurrentSelected()"
                  (change)="toggleSelectAllCurrent($any($event.target).checked)"
                  aria-label="Select all on page"
                />
              </th>
              <th class="sortable" (click)="toggleSort('fullName')">
                Candidate
                <span class="sort-icon" *ngIf="sortField === 'fullName'">
                  {{ sortOrder === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th class="sortable" (click)="toggleSort('status')">
                Status
                <span class="sort-icon" *ngIf="sortField === 'status'">
                  {{ sortOrder === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th class="sortable" (click)="toggleSort('score')">
                Score
                <span class="sort-icon" *ngIf="sortField === 'score'">
                  {{ sortOrder === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th>Job Posting</th>
              <th class="sortable" (click)="toggleSort('createdAt')">
                Applied
                <span class="sort-icon" *ngIf="sortField === 'createdAt'">
                  {{ sortOrder === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of candidates" [routerLink]="['/candidates', c.documentId]" class="clickable-row">
              <td class="select-col" (click)="$event.stopPropagation()">
                <input
                  type="checkbox"
                  [checked]="isSelected(c.id)"
                  (change)="toggleCandidateSelection(c.id, $any($event.target).checked)"
                  aria-label="Select candidate"
                />
              </td>
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

      <!-- Pagination -->
      <div class="pagination" *ngIf="!loading && totalPages > 1">
        <button class="page-btn" [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <button class="page-btn" [disabled]="currentPage === totalPages" (click)="goToPage(currentPage + 1)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    @use 'sass:color';
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
      margin-bottom: 20px;
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

    /* Filters */
    .filters-row {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fff;
      border: 1px solid $gray-200;
      border-radius: 10px;
      padding: 8px 14px;
      flex: 1;
      min-width: 200px;
      max-width: 520px;
    }
    .search-field-filter {
      max-width: 140px;
    }
    .search-divider {
      width: 1px;
      height: 18px;
      background: $gray-200;
    }
    .search-box svg { color: $gray-400; flex-shrink: 0; }
    .search-box input {
      border: none;
      outline: none;
      font-size: 14px;
      width: 100%;
      color: $gray-800;
    }
    .search-box input::placeholder { color: $gray-300; }

    .status-filter {
      min-width: 140px;
    }

    .bulk-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #fff;
      border: 1px solid $gray-200;
      border-radius: 12px;
      padding: 10px 14px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .bulk-info {
      font-size: 13px;
      font-weight: 600;
      color: $gray-600;
    }
    .bulk-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .bulk-btn {
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid $gray-200;
      background: #fff;
      color: $gray-600;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .bulk-btn:hover:not(:disabled) {
      border-color: $red;
      color: $red-deep;
    }
    .bulk-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .bulk-btn-primary {
      background: linear-gradient(135deg, $red-deep, $red);
      color: #fff;
      border-color: transparent;
    }
    .bulk-btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, $red, $red-deep);
    }
    .bulk-select {
      min-width: 140px;
    }

    .job-filter {
      min-width: 180px;
    }

    .score-filter {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border: 1px solid $gray-200;
      border-radius: 10px;
      background: #fff;
      min-width: 220px;
    }
    .score-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: $gray-600;
      font-weight: 600;
      white-space: nowrap;
    }
    .score-operator {
      min-width: 90px;
    }
    .score-slider {
      width: 120px;
      accent-color: $red;
      cursor: pointer;
    }
    .score-slider:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .score-unit {
      font-size: 12px;
      color: $gray-600;
      font-weight: 600;
      min-width: 42px;
      text-align: right;
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
    th.sortable {
      cursor: pointer;
      user-select: none;
      transition: color 0.2s;
    }
    th.sortable:hover {
      color: $red;
    }
    .sort-icon {
      margin-left: 4px;
      font-size: 9px;
      color: $red;
    }
    td {
      padding: 14px 18px;
      border-bottom: 1px solid $gray-100;
      color: $gray-800;
      vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }

    .select-col {
      width: 34px;
    }

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
    .badge-hired       { background: rgba($success, 0.18); color: color.adjust($success, $lightness: -8%); }
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

    /* Pagination */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-top: 24px;
    }
    .page-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: 1px solid $gray-200;
      border-radius: 10px;
      background: #fff;
      color: $gray-600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .page-btn:hover:not(:disabled) {
      border-color: $red;
      color: $red;
    }
    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .page-info {
      font-size: 13px;
      color: $gray-600;
      font-weight: 500;
    }
  `]
})
export class CandidatesListComponent implements OnInit {
  candidates: CandidateListItem[] = [];
  jobPostings: Array<{ documentId: string; title: string }> = [];
  loading = false;
  error = '';

  // Sorting
  sortField = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Filtering
  searchQuery = '';
  searchField: 'all' | 'name' | 'email' | 'status' | 'job' = 'all';
  statusFilter = '';
  jobPostingFilter = '';
  scoreFilterEnabled = false;
  scoreOperator: 'gt' | 'lt' = 'gt';
  scoreThreshold = 70;
  searchFieldOptions = [
    { value: 'all' as const, label: 'All fields' },
    { value: 'name' as const, label: 'Name' },
    { value: 'email' as const, label: 'Email' },
    { value: 'status' as const, label: 'Status' },
    { value: 'job' as const, label: 'Job title' },
  ];
  statusOptions = ['new', 'processing', 'processed', 'reviewing', 'shortlisted', 'rejected', 'hired', 'error'];

  selectedCandidateIds: number[] = [];
  bulkStatus = '';

  // Pagination
  currentPage = 1;
  pageSize = 25;
  totalCount = 0;
  totalPages = 1;

  constructor(
    private candidateService: CandidateService,
    private jobPostingService: JobPostingService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Read jobPostingId from query params if present
    this.route.queryParams.subscribe(params => {
      this.jobPostingFilter = params['jobPostingId'] || '';
      this.applyFilters();
    });
    this.loadJobPostings();
  }

  loadJobPostings(): void {
    this.jobPostingService.getAll().subscribe({
      next: (jobs: JobPosting[]) => {
        this.jobPostings = jobs
          .map(job => ({ documentId: job.documentId, title: job.title }))
          .filter(job => job.documentId && job.title)
          .sort((a, b) => a.title.localeCompare(b.title));
      },
      error: () => {
        this.jobPostings = [];
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.load();
  }

  load(): void {
    this.loading = true;
    const sortParam = `${this.sortField}:${this.sortOrder}`;
    const filters: {
      status?: string;
      search?: string;
      searchField?: 'all' | 'name' | 'email' | 'status' | 'job';
      jobPostingId?: string;
      scoreOperator?: 'gt' | 'lt';
      scoreThreshold?: number;
    } = {};

    if (this.statusFilter) {
      filters.status = this.statusFilter;
    }
    if (this.searchQuery.trim()) {
      filters.search = this.searchQuery.trim();
      filters.searchField = this.searchField;
    }
    if (this.jobPostingFilter) {
      filters.jobPostingId = this.jobPostingFilter;
    }
    if (this.scoreFilterEnabled) {
      const threshold = Number(this.scoreThreshold);
      if (Number.isFinite(threshold)) {
        filters.scoreOperator = this.scoreOperator;
        filters.scoreThreshold = Math.min(100, Math.max(0, Math.round(threshold)));
      }
    }

    this.candidateService.getAllHr(this.currentPage, this.pageSize, sortParam, filters).subscribe({
      next: (res) => {
        this.candidates = res.data;
        this.totalCount = res.meta.pagination.total;
        this.totalPages = res.meta.pagination.pageCount;
        const currentIds = new Set(this.candidates.map(c => c.id).filter((id): id is number => Number.isFinite(id)));
        this.selectedCandidateIds = this.selectedCandidateIds.filter(id => currentIds.has(id));
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load candidates.';
        this.loading = false;
      }
    });
  }

  getSearchPlaceholder(): string {
    switch (this.searchField) {
      case 'name':
        return 'Search candidate name...';
      case 'email':
        return 'Search email...';
      case 'status':
        return 'Search status...';
      case 'job':
        return 'Search job title...';
      default:
        return 'Search by name, email, status, or job...';
    }
  }

  toggleSort(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'desc';
    }
    this.currentPage = 1;
    this.load();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.load();
    }
  }

  isSelected(id?: number): boolean {
    if (!Number.isFinite(id)) return false;
    return this.selectedCandidateIds.includes(id as number);
  }

  toggleCandidateSelection(id: number | undefined, checked: boolean): void {
    if (!Number.isFinite(id)) return;
    const value = id as number;
    if (checked && !this.selectedCandidateIds.includes(value)) {
      this.selectedCandidateIds = [...this.selectedCandidateIds, value];
      return;
    }
    if (!checked) {
      this.selectedCandidateIds = this.selectedCandidateIds.filter(item => item !== value);
    }
  }

  selectAllCurrent(): void {
    const ids = this.candidates
      .map(c => c.id)
      .filter((id): id is number => Number.isFinite(id));
    const merged = new Set([...this.selectedCandidateIds, ...ids]);
    this.selectedCandidateIds = Array.from(merged);
  }

  toggleSelectAllCurrent(checked: boolean): void {
    if (checked) {
      this.selectAllCurrent();
      return;
    }
    const pageIds = new Set(this.candidates.map(c => c.id).filter((id): id is number => Number.isFinite(id)));
    this.selectedCandidateIds = this.selectedCandidateIds.filter(id => !pageIds.has(id));
  }

  allCurrentSelected(): boolean {
    const pageIds = this.candidates.map(c => c.id).filter((id): id is number => Number.isFinite(id));
    if (pageIds.length === 0) return false;
    return pageIds.every(id => this.selectedCandidateIds.includes(id));
  }

  clearSelection(): void {
    this.selectedCandidateIds = [];
    this.bulkStatus = '';
  }

  applyBulkStatus(): void {
    if (!this.bulkStatus || this.selectedCandidateIds.length === 0) return;
    this.loading = true;
    this.candidateService.bulkUpdateStatus(this.selectedCandidateIds, this.bulkStatus).subscribe({
      next: (res) => {
        const updated = new Set(res.updatedIds ?? []);
        this.candidates = this.candidates.map(c =>
          updated.has(c.id as number) ? { ...c, status: this.bulkStatus } : c
        );
        this.clearSelection();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to update candidate statuses.';
        this.loading = false;
      }
    });
  }
}
