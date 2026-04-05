import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
            <div class="preview" [ngClass]="getPreviewClass(selectedTemplateKey)">
              <div class="preview-header">
                <div>
                  <div class="preview-name">{{ sample.fullName }}</div>
                  <div class="preview-role">{{ sample.title }}</div>
                </div>
                <div class="preview-meta">
                  <div>{{ sample.email }}</div>
                  <div>{{ sample.phone }}</div>
                  <div>{{ sample.location }}</div>
                </div>
              </div>

              <div class="preview-body">
                <div class="preview-side">
                  <div class="preview-section skills">
                    <div class="preview-label">Skills</div>
                    <div class="preview-tags">
                      <span *ngFor="let skill of sample.skills">{{ skill }}</span>
                    </div>
                  </div>

                  <div class="preview-section focus">
                    <div class="preview-label">Highlights</div>
                    <ul>
                      <li *ngFor="let item of sample.highlights">{{ item }}</li>
                    </ul>
                  </div>
                </div>

                <div class="preview-main">
                  <div class="preview-section summary">
                    <div class="preview-label">Profile summary</div>
                    <p>{{ sample.summary }}</p>
                  </div>

                  <div class="preview-section experience">
                    <div class="preview-label">Experience</div>
                    <div class="preview-item" *ngFor="let exp of sample.experience">
                      <div class="preview-item-title">{{ exp.title }}</div>
                      <div class="preview-item-sub">{{ exp.company }} • {{ exp.period }}</div>
                      <ul>
                        <li *ngFor="let detail of exp.details">{{ detail }}</li>
                      </ul>
                    </div>
                  </div>

                  <div class="preview-section education">
                    <div class="preview-label">Education</div>
                    <div class="preview-item">
                      <div class="preview-item-title">{{ sample.education.degree }}</div>
                      <div class="preview-item-sub">{{ sample.education.school }} • {{ sample.education.period }}</div>
                    </div>
                  </div>

                  <div class="preview-section projects">
                    <div class="preview-label">Projects</div>
                    <ul>
                      <li *ngFor="let project of sample.projects">{{ project }}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
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

    .preview {
      background: #fff;
      border-radius: 12px;
      border: 1px solid $gray-200;
      padding: 18px;
      color: $gray-700;
      font-size: 12px;
      --accent: #8b1f1f;
      --accent-soft: rgba(139, 31, 31, 0.12);
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid $gray-200;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }

    .preview-name {
      font-size: 16px;
      font-weight: 800;
      color: $gray-800;
    }

    .preview-role {
      font-size: 12px;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .preview-meta {
      text-align: right;
      font-size: 11px;
      color: $gray-400;
    }

    .preview-body {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .preview-side,
    .preview-main {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .preview-section {
      background: $gray-50;
      border: 1px solid $gray-200;
      border-radius: 12px;
      padding: 12px;
    }

    .preview-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: $gray-600;
      margin-bottom: 8px;
    }

    .preview-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .preview-tags span {
      background: var(--accent-soft);
      color: var(--accent);
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 700;
    }

    .preview-item {
      margin-bottom: 10px;
    }

    .preview-item-title {
      font-weight: 700;
      color: $gray-800;
      margin-bottom: 2px;
    }

    .preview-item-sub {
      font-size: 11px;
      color: $gray-400;
      margin-bottom: 6px;
    }

    .preview-section ul {
      padding-left: 16px;
      margin: 0;
    }

    .layout-sidebar .preview-body {
      grid-template-columns: 220px 1fr;
    }

    .layout-sidebar .preview-side {
      background: var(--accent-soft);
      border-radius: 12px;
      padding: 12px;
    }

    .layout-compact {
      font-size: 11px;
    }

    .layout-compact .preview-section {
      padding: 10px;
    }

    .layout-skills-first .preview-side {
      order: -1;
    }

    .layout-experience-first .preview-section.experience {
      order: -1;
    }

    .layout-education-first .preview-section.education {
      order: -1;
    }

    .layout-project-first .preview-section.projects {
      order: -1;
    }

    /* Accent themes */
    .theme-standard { --accent: #8b1f1f; --accent-soft: rgba(139, 31, 31, 0.12); }
    .theme-experience_first { --accent: #4338ca; --accent-soft: rgba(67, 56, 202, 0.12); }
    .theme-skills_first { --accent: #111827; --accent-soft: rgba(17, 24, 39, 0.12); }
    .theme-compact { --accent: #4b5563; --accent-soft: rgba(75, 85, 99, 0.12); }
    .theme-education_first { --accent: #1f2937; --accent-soft: rgba(31, 41, 55, 0.12); }
    .theme-project_focus { --accent: #059669; --accent-soft: rgba(5, 150, 105, 0.12); }
    .theme-sidebar_photo { --accent: #0f172a; --accent-soft: rgba(15, 23, 42, 0.12); }
    .theme-accent_pink { --accent: #db2777; --accent-soft: rgba(219, 39, 119, 0.12); }
    .theme-teal_circle { --accent: #0d9488; --accent-soft: rgba(13, 148, 136, 0.12); }
    .theme-navy_gold { --accent: #1e3a5f; --accent-soft: rgba(30, 58, 95, 0.12); }
    .theme-sunset { --accent: #ea580c; --accent-soft: rgba(234, 88, 12, 0.12); }

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

  sample = {
    fullName: 'Amira Ben Salah',
    title: 'Senior Data Analyst',
    email: 'amira.bensalah@mail.com',
    phone: '+216 55 123 456',
    location: 'Sfax, Tunisia',
    summary: 'Data analyst with 7 years of experience turning raw data into business decisions. Skilled in KPI design, automation, and stakeholder storytelling.',
    skills: ['SQL', 'Power BI', 'Python', 'A/B Testing', 'Forecasting'],
    highlights: [
      'Built executive dashboards for 12 teams',
      'Reduced reporting time by 45%',
      'Automated churn alerts with weekly insights'
    ],
    experience: [
      {
        title: 'Lead Data Analyst',
        company: 'Nova Labs',
        period: '2021 - Present',
        details: ['Owned KPI framework across growth teams', 'Mentored 4 analysts and aligned metrics']
      },
      {
        title: 'Data Analyst',
        company: 'Atlas Retail',
        period: '2018 - 2021',
        details: ['Optimized sales forecast accuracy by 18%', 'Built self-serve Power BI workspace']
      }
    ],
    education: {
      degree: 'MSc Applied Statistics',
      school: 'University of Sfax',
      period: '2016 - 2018'
    },
    projects: ['Customer churn model rollout', 'Sales pipeline automation'],
  };

  constructor(
    private candidateService: CandidateService,
    public i18n: I18nService
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
        this.saving = false;
      }
    });
  }

  getPreviewClass(key: CvTemplateKey): string {
    const layout = this.getLayoutClass(key);
    return `theme-${key} ${layout}`;
  }

  getLayoutClass(key: CvTemplateKey): string {
    if (key === 'sidebar_photo' || key === 'navy_gold') return 'layout-sidebar';
    if (key === 'skills_first') return 'layout-skills-first';
    if (key === 'experience_first') return 'layout-experience-first';
    if (key === 'education_first') return 'layout-education-first';
    if (key === 'project_focus') return 'layout-project-first';
    if (key === 'compact') return 'layout-compact';
    return 'layout-standard';
  }
}
