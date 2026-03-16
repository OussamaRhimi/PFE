import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CandidateService, CandidateDetail } from '../../services/candidate.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-candidate-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <!-- Back navigation -->
      <a routerLink="/candidates" class="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        All Candidates
      </a>

      <!-- Loading skeleton -->
      <div class="skeleton-page" *ngIf="loading">
        <div class="sk sk-title"></div>
        <div class="sk sk-sub"></div>
        <div class="sk-grid">
          <div class="sk sk-card"></div>
          <div class="sk sk-card"></div>
          <div class="sk sk-card"></div>
          <div class="sk sk-card"></div>
        </div>
      </div>

      <!-- Error -->
      <div class="alert error" *ngIf="error && !loading">
        {{ error }}
      </div>

      <!-- Main content -->
      <ng-container *ngIf="candidate && !loading">
        <!-- Hero header -->
        <div class="hero">
          <div class="avatar-big">{{ candidate.fullName.charAt(0).toUpperCase() }}</div>
          <div class="hero-info">
            <h1 class="candidate-name">{{ candidate.fullName }}</h1>
            <div class="hero-meta">
              <a [href]="'mailto:' + candidate.email" class="meta-chip email-chip">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
                {{ candidate.email }}
              </a>
              <span class="meta-chip" *ngIf="candidate.jobTitle">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                {{ candidate.jobTitle }}
              </span>
              <span class="meta-chip" *ngIf="candidate.selfReportedYearsExperience != null">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ candidate.selfReportedYearsExperience }} yr{{ candidate.selfReportedYearsExperience !== 1 ? 's' : '' }} exp.
              </span>
            </div>
          </div>
          <div class="hero-actions">
            <span class="status-badge" [ngClass]="'badge-' + candidate.status">{{ candidate.status }}</span>
          </div>
        </div>

        <!-- Cards grid -->
        <div class="cards">

          <!-- Score card -->
          <div class="card card-score">
            <div class="card-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              AI Score
            </div>
            <div class="score-display">
              <svg class="score-ring" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f3f7" stroke-width="8"/>
                <circle cx="40" cy="40" r="34" fill="none" stroke="url(#scoreGrad)" stroke-width="8"
                  stroke-dasharray="{{ (candidate.score / 100) * 213.6 }} 213.6"
                  stroke-linecap="round"
                  transform="rotate(-90 40 40)"/>
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#791212"/>
                    <stop offset="100%" style="stop-color:#8b1f1f"/>
                  </linearGradient>
                </defs>
              </svg>
              <span class="score-num">{{ candidate.score | number:'1.0-0' }}</span>
            </div>
            <div class="score-label">out of 100</div>
          </div>

          <!-- Status card -->
          <div class="card">
            <div class="card-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Application Status
            </div>
            <div class="stat-value">
              <span class="status-badge large-badge" [ngClass]="'badge-' + candidate.status">{{ candidate.status }}</span>
            </div>
            <div class="card-sub">Applied {{ candidate.createdAt | date:'dd MMM yyyy' }}</div>
            <div class="card-sub" *ngIf="candidate.updatedAt !== candidate.createdAt">
              Updated {{ candidate.updatedAt | date:'dd MMM yyyy' }}
            </div>
          </div>

          <!-- GDPR card -->
          <div class="card card-gdpr">
            <div class="card-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              GDPR / Consent
            </div>
            <div class="gdpr-row">
              <span class="gdpr-key">Consent given</span>
              <span class="gdpr-val" [class.yes]="candidate.consent" [class.no]="!candidate.consent">
                {{ candidate.consent ? '✓ Yes' : '✗ No' }}
              </span>
            </div>
            <div class="gdpr-row" *ngIf="candidate.consentAt">
              <span class="gdpr-key">Consent date</span>
              <span class="gdpr-val">{{ candidate.consentAt | date:'dd MMM yyyy, HH:mm' }}</span>
            </div>
            <div class="gdpr-row" *ngIf="candidate.retentionUntil">
              <span class="gdpr-key">Retain until</span>
              <span class="gdpr-val">{{ candidate.retentionUntil | date:'dd MMM yyyy' }}</span>
            </div>
          </div>

          <!-- Links card -->
          <div class="card" *ngIf="candidate.linkedin || candidate.portfolio">
            <div class="card-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              Links
            </div>
            <div class="links">
              <a *ngIf="candidate.linkedin" [href]="candidate.linkedin" target="_blank" rel="noopener" class="external-link linkedin-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                LinkedIn Profile
              </a>
              <a *ngIf="candidate.portfolio" [href]="candidate.portfolio" target="_blank" rel="noopener" class="external-link portfolio-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                Portfolio / Website
              </a>
            </div>
          </div>
        </div>

        <!-- Notes row -->
        <div class="notes-row">
          <div class="note-card" *ngIf="candidate.candidateNotes">
            <div class="note-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Candidate's Note
            </div>
            <p class="note-text">{{ candidate.candidateNotes }}</p>
          </div>

          <div class="note-card note-card-hr" *ngIf="candidate.hrNotes">
            <div class="note-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              HR Notes
            </div>
            <p class="note-text">{{ candidate.hrNotes }}</p>
          </div>

          <div class="note-card note-placeholder" *ngIf="!candidate.hrNotes">
            <div class="note-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              HR Notes
            </div>
            <p class="note-text placeholder">No HR notes yet. Notes can be added via S2-US9.</p>
          </div>
        </div>

        <!-- Resume section -->
        <div class="resume-section">
          <div class="resume-header">
            <div class="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Resume
            </div>
          </div>

          <div class="resume-card" *ngIf="candidate.resume; else noResume">
            <div class="resume-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div class="resume-info">
              <div class="resume-name">{{ candidate.resume.name }}</div>
              <div class="resume-meta">
                <span class="mime-badge">{{ getFileTypeLabel(candidate.resume.mime) }}</span>
                <span>{{ formatSize(candidate.resume.size) }}</span>
              </div>
            </div>
            <a [href]="downloadUrl" target="_blank" rel="noopener" class="btn-download">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Resume
            </a>
          </div>

          <ng-template #noResume>
            <div class="no-resume">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd0dc" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>No resume attached</span>
            </div>
          </ng-template>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    $red: #8b1f1f;
    $red-mid: #a31a1a;
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
      max-width: 1100px;
      margin: 28px auto;
      padding: 0 24px 60px;
    }

    /* Back link */
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: $gray-400;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      margin-bottom: 24px;
      transition: color 0.2s;
    }
    .back-link:hover { color: $red; }

    /* Skeleton */
    .skeleton-page { }
    .sk {
      border-radius: 12px;
      background: linear-gradient(90deg, #f1f3f7 25%, #f9fafb 50%, #f1f3f7 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      margin-bottom: 16px;
    }
    .sk-title { height: 40px; width: 40%; }
    .sk-sub   { height: 20px; width: 55%; }
    .sk-grid  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px; }
    .sk-card  { height: 140px; }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    /* Alert */
    .alert.error {
      padding: 16px 20px;
      border-radius: 12px;
      background: #fff5f5;
      color: $error;
      border: 1px solid rgba($error, 0.2);
      font-size: 14px;
    }

    /* Hero */
    .hero {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      background: linear-gradient(135deg, #1c1c28, #252b3b);
      border-radius: 24px;
      padding: 28px 32px;
      margin-bottom: 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    }
    .avatar-big {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, $red-deep, $red-mid);
      color: #fff;
      font-size: 26px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 16px rgba($red, 0.35);
    }
    .hero-info { flex: 1; }
    .candidate-name {
      margin: 0 0 10px;
      font-size: 1.7rem;
      font-weight: 800;
      color: #fff;
    }
    .hero-meta { display: flex; flex-wrap: wrap; gap: 8px; }
    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      background: rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.8);
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      transition: background 0.2s;
    }
    .email-chip:hover { background: rgba(255,255,255,0.18); }
    .hero-actions { flex-shrink: 0; }

    /* Status badge */
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .large-badge { font-size: 13px; padding: 8px 20px; }
    .badge-new         { background: rgba(#3b82f6, 0.12); color: #1d4ed8; }
    .badge-processing  { background: rgba($warning, 0.12); color: $warning; }
    .badge-processed   { background: rgba($warning, 0.12); color: darken($warning, 5%); }
    .badge-reviewing   { background: rgba(#8b5cf6, 0.12); color: #6d28d9; }
    .badge-shortlisted { background: rgba($success, 0.14); color: $success; }
    .badge-rejected    { background: rgba($error, 0.12); color: $error; }
    .badge-hired       { background: rgba($success, 0.2);  color: darken($success, 10%); }
    .badge-error       { background: rgba($error, 0.12);  color: $error; }

    /* Cards grid */
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 18px;
      margin-bottom: 20px;
    }
    .card {
      background: #fff;
      border-radius: 18px;
      padding: 22px 24px;
      border: 1px solid $gray-200;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }
    .card-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: $gray-400;
      margin-bottom: 16px;
    }
    .stat-value { margin-bottom: 8px; }
    .card-sub { font-size: 12px; color: $gray-400; margin-top: 4px; }

    /* Score card */
    .card-score { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .score-display { position: relative; width: 80px; height: 80px; margin: 8px auto; }
    .score-ring { width: 80px; height: 80px; }
    .score-num {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 800;
      color: $gray-800;
    }
    .score-label { font-size: 11px; color: $gray-400; margin-top: 4px; }

    /* GDPR card */
    .gdpr-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .gdpr-key { color: $gray-600; }
    .gdpr-val { font-weight: 600; color: $gray-800; }
    .gdpr-val.yes { color: $success; }
    .gdpr-val.no  { color: $error; }

    /* Links */
    .links { display: flex; flex-direction: column; gap: 10px; }
    .external-link {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }
    .linkedin-link { background: rgba(#0077b5, 0.08); color: #0077b5; }
    .linkedin-link:hover { background: rgba(#0077b5, 0.15); }
    .portfolio-link { background: rgba($gray-600, 0.08); color: $gray-700; }
    .portfolio-link:hover { background: rgba($gray-600, 0.15); }

    /* Notes */
    .notes-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 20px; }
    @media (max-width: 700px) { .notes-row { grid-template-columns: 1fr; } }

    .note-card {
      background: #fff;
      border-radius: 18px;
      padding: 22px 24px;
      border: 1px solid $gray-200;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }
    .note-card-hr { border-left: 4px solid $red; }
    .note-placeholder { border-left: 4px solid $gray-200; }
    .note-header {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: $gray-400;
      margin-bottom: 14px;
    }
    .note-text { font-size: 14px; color: $gray-700; line-height: 1.65; margin: 0; white-space: pre-wrap; }
    .note-text.placeholder { color: $gray-300; font-style: italic; }

    /* Resume section */
    .resume-section {
      background: #fff;
      border-radius: 20px;
      border: 1px solid $gray-200;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      padding: 24px;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: $gray-600;
      margin-bottom: 20px;
    }
    .resume-card {
      display: flex;
      align-items: center;
      gap: 18px;
      background: linear-gradient(135deg, $gray-50, #fff);
      border: 1px solid $gray-200;
      border-radius: 16px;
      padding: 20px 24px;
    }
    .resume-icon {
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, $red-deep, $red);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      flex-shrink: 0;
      box-shadow: 0 4px 14px rgba($red, 0.3);
    }
    .resume-info { flex: 1; }
    .resume-name { font-size: 15px; font-weight: 700; color: $gray-800; margin-bottom: 6px; }
    .resume-meta { display: flex; align-items: center; gap: 10px; font-size: 12px; color: $gray-400; }
    .mime-badge {
      padding: 2px 8px;
      background: rgba($red, 0.07);
      color: $red-deep;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
    }

    .btn-download {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: linear-gradient(135deg, $red-deep, $red);
      color: #fff;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.25s;
      box-shadow: 0 4px 16px rgba($red, 0.3);
      flex-shrink: 0;
    }
    .btn-download:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba($red, 0.4);
    }

    .no-resume {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px;
      color: $gray-400;
      font-size: 14px;
    }
  `]
})
export class CandidateDetailComponent implements OnInit {
  candidate: CandidateDetail | null = null;
  loading = false;
  error = '';
  downloadUrl = '';

  constructor(
    private route: ActivatedRoute,
    private candidateService: CandidateService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Invalid candidate ID.';
      return;
    }
    this.downloadUrl = this.buildDownloadUrl(id);
    this.load(id);
  }

  load(id: string): void {
    this.loading = true;
    this.candidateService.getHrDetail(id).subscribe({
      next: (data) => { this.candidate = data; this.loading = false; },
      error: (err) => {
        this.error = err?.error?.error?.message || 'Failed to load candidate details.';
        this.loading = false;
      }
    });
  }

  buildDownloadUrl(id: string): string {
    const token = this.authService.getToken();
    // We open the link in new tab – the interceptor won't attach header there,
    // so we embed the token as a query param for this specific download endpoint.
    return `http://localhost:1337/api/candidates/hr/${id}/resume?token=${token}`;
  }

  getFileTypeLabel(mime: string): string {
    if (!mime) return 'FILE';
    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('word') || mime.includes('document')) return 'DOCX';
    if (mime.includes('msword')) return 'DOC';
    return mime.split('/')[1]?.toUpperCase() || 'FILE';
  }

  formatSize(kb: number): string {
    if (!kb) return '';
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }
}
