import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CandidateService, ApplyPayload } from '../../services/candidate.service';
import { JobPostingService, JobPosting } from '../../services/job-posting.service';
import { I18nService } from '../../services/i18n.service';
import { PublicNavbarComponent } from '../../components/public-navbar/public-navbar.component';
import { PublicFooterComponent } from '../../components/public-footer/public-footer.component';

@Component({
  selector: 'app-apply',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PublicNavbarComponent, PublicFooterComponent],
  template: `
    <app-public-navbar />

    <main class="apply-page">
      <!-- Loading job info -->
      <p class="center" *ngIf="loadingJob">{{ i18n.t('apply.loadingJob') }}</p>

      <!-- Job not found -->
      <div class="alert error" *ngIf="jobError">{{ jobError }}</div>

      <!-- ── Success state ── -->
      <div class="success-card" *ngIf="submitted && trackingToken">
        <div class="success-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/>
          </svg>
        </div>
        <h2>{{ i18n.t('apply.successTitle') }}</h2>
        <p>{{ i18n.t('apply.successText') }}</p>
        <div class="token-box">
          <label>{{ i18n.t('apply.tokenLabel') }}</label>
          <div class="token-value">
            <code>{{ trackingToken }}</code>
            <button class="btn-copy" (click)="copyToken()">{{ copied ? '✓' : i18n.t('apply.copy') }}</button>
          </div>
          <p class="token-warning">{{ i18n.t('apply.tokenWarning') }}</p>
        </div>
        <div class="success-actions">
          <a routerLink="/jobs" class="btn-secondary">{{ i18n.t('apply.backToJobs') }}</a>
          <a [routerLink]="['/track']" [queryParams]="{ email: form.email }" class="btn-primary">{{ i18n.t('apply.trackNow') }}</a>
        </div>
      </div>

      <!-- ── Application form ── -->
      <div class="form-wrapper" *ngIf="!submitted && job">
        <div class="form-header">
          <h1>{{ i18n.t('apply.title') }}</h1>
          <p class="job-name">{{ job.title }}</p>
        </div>

        <div class="alert error" *ngIf="error">{{ error }}<button (click)="error=''">&times;</button></div>

        <form (ngSubmit)="submit()" class="form-card">
          <div class="form-row">
            <div class="field">
              <label>{{ i18n.t('apply.fullName') }} *</label>
              <input type="text" [(ngModel)]="form.fullName" name="fullName" required
                     [placeholder]="i18n.t('apply.fullNamePh')" [class.invalid]="attemptedSubmit && !form.fullName.trim()" />
              <span class="field-error" *ngIf="attemptedSubmit && !form.fullName.trim()">{{ i18n.t('apply.required') }}</span>
            </div>
            <div class="field">
              <label>{{ i18n.t('apply.email') }} *</label>
              <input type="email" [(ngModel)]="form.email" name="email" required
                     [placeholder]="i18n.t('apply.emailPh')" [class.invalid]="attemptedSubmit && !isValidEmail()" />
              <span class="field-error" *ngIf="attemptedSubmit && !form.email.trim()">{{ i18n.t('apply.required') }}</span>
              <span class="field-error" *ngIf="attemptedSubmit && form.email.trim() && !isValidEmail()">{{ i18n.t('apply.invalidEmail') }}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>{{ i18n.t('apply.linkedin') }}</label>
              <input type="url" [(ngModel)]="form.linkedin" name="linkedin"
                     [placeholder]="i18n.t('apply.linkedinPh')" />
            </div>
            <div class="field">
              <label>{{ i18n.t('apply.portfolio') }}</label>
              <input type="url" [(ngModel)]="form.portfolio" name="portfolio"
                     [placeholder]="i18n.t('apply.portfolioPh')" />
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>{{ i18n.t('apply.yearsExp') }}</label>
              <input type="number" [(ngModel)]="form.selfReportedYearsExperience" name="yearsExp" min="0" max="50"
                     [placeholder]="i18n.t('apply.yearsExpPh')" />
            </div>
          </div>

          <div class="field">
            <label>{{ i18n.t('apply.candidateNotes') }}</label>
            <textarea [(ngModel)]="form.candidateNotes" name="candidateNotes" rows="4"
                      [placeholder]="i18n.t('apply.candidateNotesPh')"></textarea>
          </div>

          <!-- ── Resume upload ── -->
          <div class="field">
            <label>{{ i18n.t('apply.resume') }} *</label>
            <div class="file-upload" [class.invalid]="attemptedSubmit && !selectedFile" [class.has-file]="selectedFile">
              <input type="file" id="resume" (change)="onFileSelect($event)"
                     accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
              <label for="resume" class="file-label">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span *ngIf="!selectedFile">{{ i18n.t('apply.chooseFile') }}</span>
                <span *ngIf="selectedFile" class="file-name">{{ selectedFile.name }} ({{ (selectedFile.size / 1024 / 1024).toFixed(1) }} MB)</span>
              </label>
            </div>
            <span class="field-hint">{{ i18n.t('apply.fileHint') }}</span>
            <span class="field-error" *ngIf="fileError">{{ fileError }}</span>
            <span class="field-error" *ngIf="attemptedSubmit && !selectedFile && !fileError">{{ i18n.t('apply.required') }}</span>
          </div>

          <!-- ── GDPR Consent (US3) ── -->
          <div class="consent-section">
            <div class="gdpr-notice">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <div>
                <strong>{{ i18n.t('apply.gdprTitle') }}</strong>
                <p>{{ i18n.t('apply.gdprText') }}</p>
              </div>
            </div>
            <label class="consent-checkbox" [class.invalid]="attemptedSubmit && !form.consent">
              <input type="checkbox" [(ngModel)]="form.consent" name="consent" />
              <span class="checkmark"></span>
              <span>{{ i18n.t('apply.consentLabel') }}</span>
            </label>
            <span class="field-error" *ngIf="attemptedSubmit && !form.consent">{{ i18n.t('apply.consentRequired') }}</span>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="submitting">
              {{ submitting ? i18n.t('apply.submitting') : i18n.t('apply.submit') }}
            </button>
            <a routerLink="/jobs" class="btn-secondary">{{ i18n.t('apply.cancel') }}</a>
          </div>
        </form>
      </div>
    </main>

    <app-public-footer />
  `,
  styles: [`
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
    $error: #dc2626;
    $success: #16a34a;

    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: $gray-50;
    }

    .apply-page {
      flex: 1;
      max-width: 720px;
      margin: 0 auto;
      padding: 32px 24px 64px;
      width: 100%;
    }

    .center { text-align: center; color: $gray-400; padding: 48px 0; }
    .alert.error {
      background: #fef2f2;
      color: $error;
      padding: 12px 18px;
      border-radius: 10px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .alert button {
      background: none;
      border: none;
      color: $error;
      font-size: 18px;
      cursor: pointer;
    }

    /* ── Form header ── */
    .form-header {
      margin-bottom: 24px;
    }
    .form-header h1 {
      font-size: 1.5rem;
      font-weight: 800;
      color: $gray-800;
      margin: 0 0 8px;
    }
    .job-name {
      font-size: 1rem;
      color: $logo-red;
      font-weight: 600;
      margin: 0;
    }

    /* ── Form card ── */
    .form-card {
      background: #fff;
      border: 1px solid $gray-200;
      border-radius: 16px;
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field label {
      font-size: 13.5px;
      font-weight: 600;
      color: $gray-700;
    }
    .field input,
    .field textarea {
      padding: 10px 14px;
      border: 1.5px solid $gray-200;
      border-radius: 10px;
      font-size: 14px;
      transition: border-color 0.2s;
      background: #fff;
    }
    .field input:focus,
    .field textarea:focus {
      outline: none;
      border-color: $logo-red;
    }
    .field input.invalid,
    .field textarea.invalid {
      border-color: $error;
    }

    .field-error {
      font-size: 12px;
      color: $error;
      font-weight: 500;
    }
    .field-hint {
      font-size: 12px;
      color: $gray-400;
    }

    /* ── File upload ── */
    .file-upload {
      position: relative;
      border: 2px dashed $gray-300;
      border-radius: 12px;
      transition: border-color 0.2s, background 0.2s;
    }
    .file-upload:hover {
      border-color: $logo-red;
      background: rgba($logo-red, 0.02);
    }
    .file-upload.has-file {
      border-color: $success;
      background: #f0fdf4;
    }
    .file-upload.invalid {
      border-color: $error;
    }
    .file-upload input[type="file"] {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
    .file-label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 24px;
      color: $gray-400;
      font-size: 14px;
      cursor: pointer;
    }
    .file-name {
      color: $gray-800;
      font-weight: 600;
    }

    /* ── Consent section (US3) ── */
    .consent-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 20px;
      background: #f0f4ff;
      border-radius: 12px;
      border: 1px solid #dbeafe;
    }
    .gdpr-notice {
      display: flex;
      gap: 12px;
      color: $gray-700;
    }
    .gdpr-notice svg {
      flex-shrink: 0;
      color: #3b82f6;
      margin-top: 2px;
    }
    .gdpr-notice strong {
      font-size: 14px;
      display: block;
      margin-bottom: 4px;
    }
    .gdpr-notice p {
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
      color: $gray-600;
    }

    .consent-checkbox {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13.5px;
      color: $gray-700;
      cursor: pointer;
      font-weight: 600;
    }
    .consent-checkbox input {
      margin-top: 2px;
      accent-color: $logo-red;
      width: 18px;
      height: 18px;
    }
    .consent-checkbox.invalid {
      color: $error;
    }

    /* ── Actions ── */
    .form-actions {
      display: flex;
      gap: 12px;
      padding-top: 8px;
    }
    .btn-primary {
      padding: 12px 28px;
      background: linear-gradient(135deg, $logo-red-deep, $logo-red);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s;
    }
    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, $logo-red-mid, $logo-red-deep);
      transform: translateY(-1px);
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-secondary {
      padding: 12px 28px;
      background: $gray-100;
      color: $gray-700;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-secondary:hover { background: $gray-200; }

    /* ── Success state ── */
    .success-card {
      background: #fff;
      border: 1px solid $gray-200;
      border-radius: 16px;
      padding: 48px 32px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .success-icon { margin-bottom: 8px; }
    .success-card h2 {
      font-size: 1.4rem;
      font-weight: 800;
      color: $gray-800;
      margin: 0;
    }
    .success-card > p {
      color: $gray-600;
      font-size: 14px;
      margin: 0;
    }

    .token-box {
      width: 100%;
      max-width: 500px;
      background: $gray-50;
      border: 1px solid $gray-200;
      border-radius: 12px;
      padding: 20px;
      text-align: left;
    }
    .token-box label {
      font-size: 12px;
      font-weight: 600;
      color: $gray-400;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .token-value {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    .token-value code {
      flex: 1;
      font-size: 12px;
      color: $gray-800;
      word-break: break-all;
      background: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid $gray-200;
    }
    .btn-copy {
      padding: 8px 16px;
      background: $logo-red;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .token-warning {
      font-size: 12px;
      color: #d97706;
      margin: 10px 0 0;
      font-weight: 500;
    }

    .success-actions {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }

    @media (max-width: 640px) {
      .form-row { grid-template-columns: 1fr; }
      .form-card { padding: 20px; }
      .success-card { padding: 32px 20px; }
    }
  `],
})
export class ApplyComponent implements OnInit {
  job: JobPosting | null = null;
  loadingJob = true;
  jobError = '';

  form = {
    fullName: '',
    email: '',
    linkedin: '',
    portfolio: '',
    candidateNotes: '',
    selfReportedYearsExperience: null as number | null,
    consent: false,
  };

  selectedFile: File | null = null;
  fileError = '';
  attemptedSubmit = false;
  submitting = false;
  submitted = false;
  trackingToken = '';
  copied = false;
  error = '';

  private jobDocumentId = '';

  private readonly ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  private readonly MAX_SIZE_MB = 5;

  constructor(
    private candidateService: CandidateService,
    private jobService: JobPostingService,
    public i18n: I18nService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.jobDocumentId = this.route.snapshot.paramMap.get('jobId') || '';
    if (!this.jobDocumentId) {
      this.jobError = this.i18n.t('apply.noJob');
      this.loadingJob = false;
      return;
    }
    this.jobService.getOne(this.jobDocumentId).subscribe({
      next: (job) => {
        if (job.status !== 'open') {
          this.jobError = this.i18n.t('apply.jobClosed');
        } else {
          this.job = job;
        }
        this.loadingJob = false;
      },
      error: () => {
        this.jobError = this.i18n.t('apply.jobNotFound');
        this.loadingJob = false;
      },
    });
  }

  isValidEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim());
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fileError = '';
    this.selectedFile = null;

    if (!input.files?.length) return;
    const file = input.files[0];

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      this.fileError = this.i18n.t('apply.fileTypeError');
      return;
    }

    if (file.size / (1024 * 1024) > this.MAX_SIZE_MB) {
      this.fileError = this.i18n.t('apply.fileSizeError');
      return;
    }

    this.selectedFile = file;
  }

  submit(): void {
    this.attemptedSubmit = true;
    this.error = '';

    // Client-side validation
    if (
      !this.form.fullName.trim() ||
      !this.isValidEmail() ||
      !this.selectedFile ||
      !this.form.consent ||
      this.fileError
    ) {
      return;
    }

    this.submitting = true;

    const payload: ApplyPayload = {
      fullName: this.form.fullName,
      email: this.form.email,
      linkedin: this.form.linkedin,
      portfolio: this.form.portfolio,
      candidateNotes: this.form.candidateNotes,
      selfReportedYearsExperience: this.form.selfReportedYearsExperience ?? undefined,
      jobPostingId: this.jobDocumentId,
      consent: this.form.consent,
      resume: this.selectedFile
    };

    this.candidateService.apply(payload).subscribe({
      next: (res) => {
        this.trackingToken = res.publicToken;
        this.submitted = true;
        this.submitting = false;
      },
      error: (err) => {
        this.error = err.error?.error?.message || err.error?.message || this.i18n.t('apply.submitError');
        this.submitting = false;
      },
    });


  }

  copyToken(): void {
    navigator.clipboard.writeText(this.trackingToken).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }
}
