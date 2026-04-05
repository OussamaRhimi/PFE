import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CandidateService, CvTemplateKey, CvTemplateMeta } from '../../services/candidate.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-cv-templates',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <div>
          <h1>{{ i18n.t('cvTemplates.title') }}</h1>
          <p class="subtitle">{{ i18n.t('cvTemplates.subtitle') }}</p>
        </div>
        <div class="default-pill" *ngIf="defaultTemplate">
          {{ i18n.t('cvTemplates.defaultLabel') }}
          <strong>{{ defaultTemplate.name }}</strong>
        </div>
      </div>

      <div class="alert error" *ngIf="error">
        {{ error }}
        <button (click)="error = ''">&times;</button>
      </div>
      <div class="alert success" *ngIf="success">
        {{ success }}
        <button (click)="success = ''">&times;</button>
      </div>

      <p class="center" *ngIf="loading">{{ i18n.t('cvTemplates.loading') }}</p>

      <div class="layout" *ngIf="!loading">
        <section class="list-panel">
          <div class="panel-title">{{ i18n.t('cvTemplates.listTitle') }}</div>

          <button
            *ngFor="let template of templates"
            class="template-row"
            [class.active]="template.key === selectedTemplateKey"
            (click)="selectTemplate(template.key)">
            <span class="template-dot" [ngClass]="'dot-' + template.key"></span>
            <div class="template-text">
              <div class="template-name">{{ template.name }}</div>
              <div class="template-desc">{{ template.description }}</div>
            </div>
            <span class="template-badge" *ngIf="template.key === defaultTemplateKey">
              {{ i18n.t('cvTemplates.defaultTag') }}
            </span>
          </button>

          <div class="saving" *ngIf="saving">{{ i18n.t('cvTemplates.saving') }}</div>
        </section>

        <section class="preview-panel">
          <div class="panel-title">
            {{ i18n.t('cvTemplates.previewTitle') }}
            <span class="panel-sub">{{ i18n.t('cvTemplates.previewNote') }}</span>
          </div>

          <div class="preview-card">
            <div class="preview-loading" *ngIf="previewLoading">
              Loading preview...
            </div>
            <div class="preview-error" *ngIf="previewError && !previewLoading">
              {{ previewError }}
            </div>
            <div class="preview-shell" *ngIf="previewHtml && !previewLoading" [innerHTML]="previewHtml"></div>
          </div>
        </section>
      </div>
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
    $error: #dc2626;

    .page {
      max-width: 1200px;
      margin: 32px auto 60px;
      padding: 0 24px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
    }

    h1 {
      margin: 0 0 6px;
      font-size: 1.6rem;
      font-weight: 800;
      color: $gray-800;
    }

    .subtitle {
      margin: 0;
      color: $gray-600;
      font-size: 14px;
      max-width: 520px;
    }

    .default-pill {
      background: rgba($success, 0.12);
      color: #166534;
      border-radius: 999px;
      padding: 10px 16px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }

    .alert {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 16px;
      font-size: 13px;
      font-weight: 600;
    }

    .alert.error {
      background: #fff5f5;
      color: $error;
      border: 1px solid rgba($error, 0.2);
    }

    .alert.success {
      background: rgba($success, 0.12);
      color: #166534;
      border: 1px solid rgba($success, 0.2);
    }

    .alert button {
      border: none;
      background: none;
      font-size: 18px;
      cursor: pointer;
      color: inherit;
    }

    .center {
      text-align: center;
      color: $gray-600;
      font-size: 14px;
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(280px, 360px) 1fr;
      gap: 24px;
    }

    @media (max-width: 980px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .default-pill {
        align-self: flex-start;
      }
    }

    .list-panel {
      background: #fff;
      border-radius: 18px;
      border: 1px solid $gray-200;
      padding: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .panel-title {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: $gray-600;
      margin-bottom: 6px;
    }

    .template-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid $gray-200;
      background: $gray-50;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    }

    .template-row:hover {
      border-color: $gray-300;
      box-shadow: 0 6px 16px rgba(0,0,0,0.08);
      transform: translateY(-1px);
    }

    .template-row.active {
      border-color: $red;
      background: rgba($red, 0.05);
      box-shadow: 0 0 0 3px rgba($red, 0.1);
    }

    .template-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: $red;
      flex-shrink: 0;
      box-shadow: 0 0 0 4px rgba($red, 0.15);
    }

    .template-text {
      flex: 1;
    }

    .template-name {
      font-size: 13px;
      font-weight: 700;
      color: $gray-800;
      margin-bottom: 2px;
    }

    .template-desc {
      font-size: 12px;
      color: $gray-400;
    }

    .template-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba($success, 0.12);
      color: #166534;
      white-space: nowrap;
    }

    .saving {
      font-size: 12px;
      color: $gray-600;
      padding-top: 6px;
    }

    .preview-panel {
      background: #fff;
      border-radius: 18px;
      border: 1px solid $gray-200;
      padding: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }

    .panel-sub {
      display: block;
      font-size: 12px;
      color: $gray-400;
      margin-top: 4px;
      text-transform: none;
      letter-spacing: 0;
    }

    .preview-card {
      background: $gray-100;
      border-radius: 16px;
      padding: 18px;
      margin-top: 14px;
    }

    .preview-loading,
    .preview-error {
      background: #fff;
      border-radius: 12px;
      border: 1px solid $gray-200;
      padding: 16px;
      font-size: 13px;
      color: $gray-600;
    }

    .preview-error {
      color: $error;
      border-color: rgba($error, 0.2);
      background: #fff5f5;
    }

    .preview-shell {
      background: #fff;
      border-radius: 12px;
      border: 1px solid $gray-200;
      padding: 18px;
      max-height: 720px;
      overflow: auto;
    }

    .preview-shell .cv-container {
      box-shadow: 0 10px 26px rgba(0, 0, 0, 0.08);
      margin: 0 auto;
    }

    .dot-standard { background: #8b1f1f; box-shadow: 0 0 0 4px rgba(139, 31, 31, 0.15); }
    .dot-experience_first { background: #4338ca; box-shadow: 0 0 0 4px rgba(67, 56, 202, 0.15); }
    .dot-skills_first { background: #111827; box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.15); }
    .dot-compact { background: #4b5563; box-shadow: 0 0 0 4px rgba(75, 85, 99, 0.15); }
    .dot-education_first { background: #1f2937; box-shadow: 0 0 0 4px rgba(31, 41, 55, 0.15); }
    .dot-project_focus { background: #059669; box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.15); }
    .dot-sidebar_photo { background: #0f172a; box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.15); }
    .dot-accent_pink { background: #db2777; box-shadow: 0 0 0 4px rgba(219, 39, 119, 0.15); }
    .dot-teal_circle { background: #0d9488; box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.15); }
    .dot-navy_gold { background: #1e3a5f; box-shadow: 0 0 0 4px rgba(30, 58, 95, 0.15); }
    .dot-sunset { background: #ea580c; box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.15); }
  `]
})
export class CvTemplatesComponent implements OnInit {
  templates: CvTemplateMeta[] = [];
  selectedTemplateKey: CvTemplateKey = 'standard';
  defaultTemplateKey: CvTemplateKey = 'standard';
  loading = false;
  saving = false;
  error = '';
  success = '';
  previewHtml: SafeHtml | null = null;
  previewLoading = false;
  previewError = '';

  constructor(
    private candidateService: CandidateService,
    public i18n: I18nService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  get defaultTemplate(): CvTemplateMeta | null {
    return this.templates.find(t => t.key === this.defaultTemplateKey) || null;
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      templates: this.candidateService.getCvTemplates(),
      defaults: this.candidateService.getDefaultCvTemplate(),
    }).subscribe({
      next: ({ templates, defaults }) => {
        this.templates = templates;
        this.defaultTemplateKey = defaults.templateKey;
        this.selectedTemplateKey = defaults.templateKey;
        this.loadPreview(this.selectedTemplateKey);
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error?.message || this.i18n.t('cvTemplates.loadError');
        this.loading = false;
      }
    });
  }

  selectTemplate(key: CvTemplateKey): void {
    if (this.saving) return;
    this.selectedTemplateKey = key;
    this.loadPreview(key);

    if (key === this.defaultTemplateKey) {
      return;
    }

    this.saving = true;
    this.candidateService.setDefaultCvTemplate(key).subscribe({
      next: () => {
        this.defaultTemplateKey = key;
        this.success = this.i18n.t('cvTemplates.saved');
        this.saving = false;
      },
      error: (err) => {
        this.error = err?.error?.error?.message || this.i18n.t('cvTemplates.saveError');
        this.selectedTemplateKey = this.defaultTemplateKey;
        this.loadPreview(this.defaultTemplateKey);
        this.saving = false;
      }
    });
  }

  loadPreview(key: CvTemplateKey): void {
    this.previewLoading = true;
    this.previewError = '';
    this.candidateService.getCvTemplatePreview(key).subscribe({
      next: (preview) => {
        this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(preview.cvHtml);
        this.previewLoading = false;
      },
      error: (err) => {
        this.previewError = err?.error?.error?.message || 'Failed to load preview.';
        this.previewHtml = null;
        this.previewLoading = false;
      }
    });
  }
}
