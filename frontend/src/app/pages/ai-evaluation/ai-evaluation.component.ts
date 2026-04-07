import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import {
  BrainCircuit,
  ChevronDown,
  Gauge,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Sliders,
  Sparkles,
  Trash2,
  X,
} from 'lucide-angular/src/icons';
import {
  JobPostingService,
  JobPosting,
  CompletenessPointsConfig,
  CustomCriterion,
  EvaluationConfig,
  QualityThresholds,
} from '../../services/job-posting.service';

type FullEvaluationConfig = {
  fitWeight: number;
  completenessWeight: number;
  requiredSkillsWeight: number;
  niceToHaveSkillsWeight: number;
  experienceWeight: number;
  completenessPoints: FullCompletenessPointsConfig;
  customCriteria: CustomCriterion[];
  qualityThresholds: FullQualityThresholds;
};

type FullCompletenessPointsConfig = Required<CompletenessPointsConfig>;
type FullQualityThresholds = Required<QualityThresholds>;

const DEFAULTS: FullEvaluationConfig = {
  fitWeight: 75,
  completenessWeight: 25,
  requiredSkillsWeight: 75,
  niceToHaveSkillsWeight: 15,
  experienceWeight: 10,
  completenessPoints: {
    fullName: 10,
    email: 15,
    phone: 5,
    location: 5,
    links: 5,
    summary: 10,
    experience: 15,
    experienceDates: 10,
    education: 10,
    linkedin: 5,
    portfolio: 5,
    competencies: 5,
  },
  customCriteria: [],
  qualityThresholds: { excellent: 80, good: 60, fair: 40 },
};

@Component({
  selector: 'app-ai-evaluation',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="ai-config-page">
      <header class="page-header">
        <div class="page-header-row">
          <lucide-angular [img]="icons.brain" [size]="28" class="page-icon"></lucide-angular>
          <div>
            <h1>AI Evaluation Configuration</h1>
            <p class="page-subtitle">Customize how candidates are scored for each job posting</p>
          </div>
        </div>
      </header>

      <section class="job-selector card">
        <label class="selector-label" for="jobSelect">
          <lucide-angular [img]="icons.settings" [size]="18"></lucide-angular>
          Select Job Posting
        </label>
        <select
          id="jobSelect"
          class="selector-input"
          [ngModel]="selectedJobKey()"
          (ngModelChange)="onSelectJob($event)"
        >
          <option [ngValue]="null" disabled>- Choose a job posting -</option>
          <option *ngFor="let job of jobs(); trackBy: trackJob" [ngValue]="jobKey(job)">
            {{ job.title || 'Untitled' }} ({{ job.status }})
          </option>
        </select>
      </section>

      <div class="alert alert--error" *ngIf="error()">{{ error() }}</div>
      <div class="alert alert--success" *ngIf="success()">{{ success() }}</div>

      <div class="loading-state" *ngIf="loading() && !selectedJob()">Loading job postings...</div>

      <ng-container *ngIf="selectedJob()">
        <div class="action-bar">
          <span class="action-label">
            Configuring: <strong>{{ selectedJob()?.title }}</strong>
          </span>
          <div class="action-buttons">
            <button class="btn btn--outline" (click)="resetToDefaults()" [disabled]="saving()">
              <lucide-angular [img]="icons.reset" [size]="16"></lucide-angular>
              Reset Defaults
            </button>
            <button class="btn btn--primary" (click)="save()" [disabled]="saving() || !dirty()">
              <lucide-angular [img]="icons.save" [size]="16"></lucide-angular>
              {{ saving() ? 'Saving...' : 'Save Configuration' }}
            </button>
          </div>
        </div>

        <section class="config-section card">
          <button class="section-header" (click)="toggleSection('weights')">
            <lucide-angular [img]="icons.sliders" [size]="20"></lucide-angular>
            <span class="section-title">Score Weights</span>
            <span class="section-badge">Fit {{ previewScore().fitPct }}% | Completeness {{ previewScore().completenessPct }}%</span>
            <lucide-angular [img]="icons.chevron" [size]="18" [class.rotated]="isExpanded('weights')"></lucide-angular>
          </button>

          <div class="section-body" *ngIf="isExpanded('weights')">
            <p class="section-desc">
              The final score is a weighted average of <strong>Fit Score</strong> (how well the candidate matches the job)
              and <strong>Completeness Score</strong> (how complete the CV is). These two weights must sum to 100.
            </p>

            <div class="weight-pair">
              <div class="weight-row">
                <label class="weight-label">Fit Score Weight</label>
                <input
                  type="range" min="0" max="100" step="1"
                  [ngModel]="fitWeight()"
                  (ngModelChange)="onMainWeightChange('fit', $event)"
                  class="slider slider--fit"
                />
                <span class="weight-value">{{ fitWeight() }}%</span>
              </div>
              <div class="weight-row">
                <label class="weight-label">Completeness Weight</label>
                <input
                  type="range" min="0" max="100" step="1"
                  [ngModel]="completenessWeight()"
                  (ngModelChange)="onMainWeightChange('completeness', $event)"
                  class="slider slider--completeness"
                />
                <span class="weight-value">{{ completenessWeight() }}%</span>
              </div>
            </div>

            <div class="weight-preview-bar">
              <div class="weight-preview-segment weight-preview-segment--fit" [style.width.%]="previewScore().fitPct">
                Fit {{ previewScore().fitPct }}%
              </div>
              <div class="weight-preview-segment weight-preview-segment--completeness" [style.width.%]="previewScore().completenessPct">
                Comp. {{ previewScore().completenessPct }}%
              </div>
            </div>

            <p class="formula-text">Final Score = Fit Score × {{ previewScore().fitPct }}% + Completeness × {{ previewScore().completenessPct }}%</p>
          </div>
        </section>

        <section class="config-section card">
          <button class="section-header" (click)="toggleSection('fitSub')">
            <lucide-angular [img]="icons.gauge" [size]="20"></lucide-angular>
            <span class="section-title">Fit Score Breakdown</span>
            <span class="section-badge">Skills {{ fitSubPreview().requiredPct }}% | Nice {{ fitSubPreview().nicePct }}% | Exp {{ fitSubPreview().expPct }}%</span>
            <lucide-angular [img]="icons.chevron" [size]="18" [class.rotated]="isExpanded('fitSub')"></lucide-angular>
          </button>

          <div class="section-body" *ngIf="isExpanded('fitSub')">
            <p class="section-desc">
              How the Fit Score is composed from three sub-factors. Values are normalized to sum to 100%.
            </p>

            <div class="weight-pair">
              <div class="weight-row">
                <label class="weight-label">Required Skills</label>
                <input
                  type="range" min="0" max="100" step="1"
                  [ngModel]="requiredSkillsWeight()"
                  (ngModelChange)="onFitSubWeightChange('required', $event)"
                  class="slider slider--required"
                />
                <span class="weight-value">{{ requiredSkillsWeight() }}</span>
              </div>
              <div class="weight-row">
                <label class="weight-label">Nice-to-Have Skills</label>
                <input
                  type="range" min="0" max="100" step="1"
                  [ngModel]="niceToHaveSkillsWeight()"
                  (ngModelChange)="onFitSubWeightChange('nice', $event)"
                  class="slider slider--nice"
                />
                <span class="weight-value">{{ niceToHaveSkillsWeight() }}</span>
              </div>
              <div class="weight-row">
                <label class="weight-label">Experience</label>
                <input
                  type="range" min="0" max="100" step="1"
                  [ngModel]="experienceWeight()"
                  (ngModelChange)="onFitSubWeightChange('exp', $event)"
                  class="slider slider--exp"
                />
                <span class="weight-value">{{ experienceWeight() }}</span>
              </div>
            </div>

            <div class="weight-preview-bar three-part">
              <div class="weight-preview-segment weight-preview-segment--required" [style.width.%]="fitSubPreview().requiredPct">
                {{ fitSubPreview().requiredPct }}%
              </div>
              <div class="weight-preview-segment weight-preview-segment--nice" [style.width.%]="fitSubPreview().nicePct">
                {{ fitSubPreview().nicePct }}%
              </div>
              <div class="weight-preview-segment weight-preview-segment--exp" [style.width.%]="fitSubPreview().expPct">
                {{ fitSubPreview().expPct }}%
              </div>
            </div>
          </div>
        </section>

        <section class="config-section card">
          <button class="section-header" (click)="toggleSection('completeness')">
            <lucide-angular [img]="icons.settings" [size]="20"></lucide-angular>
            <span class="section-title">Completeness Points</span>
            <span class="section-badge">Total: {{ completenessPointsTotal() }} pts</span>
            <lucide-angular [img]="icons.chevron" [size]="18" [class.rotated]="isExpanded('completeness')"></lucide-angular>
          </button>

          <div class="section-body" *ngIf="isExpanded('completeness')">
            <p class="section-desc">
              Points awarded for each present field. The score is normalized to 0-100 regardless of total, but keeping them balanced helps maintain meaningful scores.
            </p>

            <div class="completeness-grid">
              <div class="completeness-row" *ngFor="let field of completenessFieldLabels; trackBy: trackField">
                <label class="completeness-label">{{ field.label }}</label>
                <input
                  type="number" min="0" max="100" step="1"
                  [ngModel]="completenessPoints()[field.key]"
                  (ngModelChange)="onCompletenessPointChange(field.key, $event)"
                  class="completeness-input"
                />
                <span class="completeness-unit">pts</span>
              </div>
            </div>

            <div class="completeness-total">
              Total: <strong>{{ completenessPointsTotal() }}</strong> points
              <span class="completeness-warn" *ngIf="completenessPointsTotal() !== 100">(will be normalized to 100%)</span>
            </div>
          </div>
        </section>

        <section class="config-section card">
          <button class="section-header" (click)="toggleSection('custom')">
            <lucide-angular [img]="icons.sparkles" [size]="20"></lucide-angular>
            <span class="section-title">Custom Criteria</span>
            <span class="section-badge">{{ customCriteria().length }} rule{{ customCriteria().length === 1 ? '' : 's' }}</span>
            <lucide-angular [img]="icons.chevron" [size]="18" [class.rotated]="isExpanded('custom')"></lucide-angular>
          </button>

          <div class="section-body" *ngIf="isExpanded('custom')">
            <p class="section-desc">
              Add bonus or penalty rules that trigger when specific keywords are found in the candidate's CV.
            </p>

            <div class="criterion-card" *ngFor="let criterion of customCriteria(); let i = index; trackBy: trackCriterion">
              <div class="criterion-header">
                <span class="criterion-label">#{{ i + 1 }}</span>
                <button class="btn-icon btn-icon--danger" (click)="removeCriterion(i)" title="Remove">
                  <lucide-angular [img]="icons.trash" [size]="16"></lucide-angular>
                </button>
              </div>

              <div class="criterion-fields">
                <div class="criterion-field">
                  <label>Name</label>
                  <input
                    type="text"
                    [ngModel]="criterion.name"
                    (ngModelChange)="updateCriterion(i, { name: $event })"
                    placeholder="e.g. Docker experience"
                    class="criterion-input"
                  />
                </div>

                <div class="criterion-field criterion-field--row">
                  <div class="criterion-field">
                    <label>Type</label>
                    <select
                      [ngModel]="criterion.type"
                      (ngModelChange)="updateCriterion(i, { type: $event })"
                      class="criterion-select"
                    >
                      <option value="bonus">Bonus (+)</option>
                      <option value="penalty">Penalty (-)</option>
                    </select>
                  </div>
                  <div class="criterion-field">
                    <label>Points</label>
                    <input
                      type="number" min="0" max="50" step="1"
                      [ngModel]="criterion.points"
                      (ngModelChange)="updateCriterion(i, { points: $event })"
                      class="criterion-input criterion-input--short"
                    />
                  </div>
                  <div class="criterion-field">
                    <label>Match Mode</label>
                    <select
                      [ngModel]="criterion.requireAll"
                      (ngModelChange)="updateCriterion(i, { requireAll: $event === 'true' || $event === true })"
                      class="criterion-select"
                    >
                      <option [ngValue]="false">Any keyword</option>
                      <option [ngValue]="true">All keywords</option>
                    </select>
                  </div>
                </div>

                <div class="criterion-field">
                  <label>Keywords</label>
                  <div class="keyword-list">
                    <div class="keyword-row" *ngFor="let kw of criterion.keywords; let ki = index; trackBy: trackKeyword">
                      <input
                        type="text"
                        [ngModel]="kw"
                        (ngModelChange)="updateKeyword(i, ki, $event)"
                        placeholder="keyword..."
                        class="criterion-input"
                      />
                      <button
                        class="btn-icon btn-icon--subtle"
                        (click)="removeKeyword(i, ki)"
                        title="Remove keyword"
                        *ngIf="criterion.keywords.length > 1"
                      >
                        <lucide-angular [img]="icons.close" [size]="14"></lucide-angular>
                      </button>
                    </div>
                    <button class="btn btn--ghost btn--sm" (click)="addKeyword(i)">
                      <lucide-angular [img]="icons.plus" [size]="14"></lucide-angular>
                      Add Keyword
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button class="btn btn--outline btn--add-criterion" (click)="addCriterion()">
              <lucide-angular [img]="icons.plus" [size]="16"></lucide-angular>
              Add Custom Criterion
            </button>
          </div>
        </section>

        <section class="config-section card">
          <button class="section-header" (click)="toggleSection('thresholds')">
            <lucide-angular [img]="icons.gauge" [size]="20"></lucide-angular>
            <span class="section-title">Quality Thresholds</span>
            <span class="section-badge">{{ qualityThresholds().excellent }}+ Excellent</span>
            <lucide-angular [img]="icons.chevron" [size]="18" [class.rotated]="isExpanded('thresholds')"></lucide-angular>
          </button>

          <div class="section-body" *ngIf="isExpanded('thresholds')">
            <p class="section-desc">
              Defines the score ranges for quality labels shown on the candidate detail page.
            </p>

            <div class="threshold-grid">
              <div class="threshold-row">
                <span class="threshold-badge threshold-badge--excellent">Excellent</span>
                <label>Score >=</label>
                <input
                  type="number" min="0" max="100" step="1"
                  [ngModel]="qualityThresholds().excellent"
                  (ngModelChange)="onThresholdChange('excellent', $event)"
                  class="threshold-input"
                />
              </div>
              <div class="threshold-row">
                <span class="threshold-badge threshold-badge--good">Good</span>
                <label>Score >=</label>
                <input
                  type="number" min="0" max="100" step="1"
                  [ngModel]="qualityThresholds().good"
                  (ngModelChange)="onThresholdChange('good', $event)"
                  class="threshold-input"
                />
              </div>
              <div class="threshold-row">
                <span class="threshold-badge threshold-badge--fair">Fair</span>
                <label>Score >=</label>
                <input
                  type="number" min="0" max="100" step="1"
                  [ngModel]="qualityThresholds().fair"
                  (ngModelChange)="onThresholdChange('fair', $event)"
                  class="threshold-input"
                />
              </div>
              <div class="threshold-row">
                <span class="threshold-badge threshold-badge--poor">Poor</span>
                <label>Score &lt;</label>
                <span class="threshold-fixed">{{ qualityThresholds().fair }}</span>
              </div>
            </div>
          </div>
        </section>
      </ng-container>
    </div>
  `,
  styles: [
    `
      :host {
        --accent: #8b1f1f;
        --text: #252b3b;
        --text-muted: #64748b;
        --border: #e2e8f0;
        --panel: #ffffff;
        --bg-hover: #f8fafc;
      }

      .ai-config-page {
        max-width: 860px;
        margin: 0 auto;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .page-header-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .page-icon { color: var(--accent); }
      .page-header h1 {
        margin: 0;
        font-size: 1.45rem;
        font-weight: 700;
        color: var(--text);
      }
      .page-subtitle {
        margin: 0.15rem 0 0;
        font-size: 0.85rem;
        color: var(--text-muted);
      }

      .card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 12px;
        overflow: hidden;
      }

      .job-selector {
        padding: 1rem 1.25rem;
      }
      .selector-label {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-weight: 600;
        font-size: 0.85rem;
        color: var(--text-muted);
        margin-bottom: 0.5rem;
      }
      .selector-input {
        width: 100%;
        padding: 0.6rem 0.75rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 0.92rem;
        background: var(--panel);
        color: var(--text);
      }
      .selector-input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(139, 31, 31, 0.12);
      }

      .alert {
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 500;
      }
      .alert--error {
        background: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fecaca;
      }
      .alert--success {
        background: #f0fdf4;
        color: #15803d;
        border: 1px solid #bbf7d0;
      }

      .loading-state {
        text-align: center;
        padding: 2rem;
        color: var(--text-muted);
        font-size: 0.9rem;
      }

      .action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .action-label {
        font-size: 0.85rem;
        color: var(--text-muted);
      }
      .action-label strong {
        color: var(--text);
      }
      .action-buttons {
        display: flex;
        gap: 0.5rem;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn--primary {
        background: var(--accent);
        color: #fff;
      }
      .btn--primary:hover:not(:disabled) { filter: brightness(1.1); }
      .btn--outline {
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text);
      }
      .btn--outline:hover:not(:disabled) { background: var(--bg-hover); }
      .btn--ghost {
        background: transparent;
        color: var(--accent);
        padding: 0.3rem 0.6rem;
        font-size: 0.78rem;
      }
      .btn--ghost:hover { background: rgba(139, 31, 31, 0.08); }
      .btn--sm { font-size: 0.78rem; padding: 0.3rem 0.6rem; }
      .btn--add-criterion {
        width: 100%;
        justify-content: center;
        margin-top: 0.5rem;
      }

      .btn-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        background: transparent;
        color: var(--text-muted);
        transition: all 0.15s;
      }
      .btn-icon:hover { background: var(--bg-hover); }
      .btn-icon--danger:hover { background: #fef2f2; color: #dc2626; }
      .btn-icon--subtle { color: #94a3b8; }

      .section-header {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        width: 100%;
        padding: 0.85rem 1.25rem;
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 0.92rem;
        color: var(--text);
        text-align: left;
        transition: background 0.15s;
      }
      .section-header:hover { background: var(--bg-hover); }
      .section-title { font-weight: 700; flex: 1; }
      .section-badge {
        font-size: 0.72rem;
        font-weight: 600;
        padding: 0.2rem 0.55rem;
        border-radius: 20px;
        background: rgba(139, 31, 31, 0.1);
        color: var(--accent);
        white-space: nowrap;
      }
      .section-header lucide-angular:last-child {
        transition: transform 0.2s;
      }
      .section-header lucide-angular.rotated {
        transform: rotate(180deg);
      }

      .section-body {
        padding: 0.75rem 1.25rem 1.25rem;
        border-top: 1px solid var(--border);
      }
      .section-desc {
        margin: 0 0 1rem;
        font-size: 0.82rem;
        color: var(--text-muted);
        line-height: 1.5;
      }

      .weight-pair {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .weight-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .weight-label {
        width: 140px;
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--text);
        flex-shrink: 0;
      }
      .weight-value {
        width: 40px;
        text-align: right;
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--accent);
        flex-shrink: 0;
      }

      .slider {
        flex: 1;
        -webkit-appearance: none;
        appearance: none;
        height: 6px;
        border-radius: 3px;
        background: var(--border);
        outline: none;
      }
      .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--accent);
        cursor: pointer;
        border: 2px solid #fff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
      }
      .slider--fit::-webkit-slider-thumb { background: #8b1f1f; }
      .slider--completeness::-webkit-slider-thumb { background: #0ea5e9; }
      .slider--required::-webkit-slider-thumb { background: #8b1f1f; }
      .slider--nice::-webkit-slider-thumb { background: #8b5cf6; }
      .slider--exp::-webkit-slider-thumb { background: #f59e0b; }

      .weight-preview-bar {
        display: flex;
        height: 28px;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 0.75rem;
        font-size: 0.72rem;
        font-weight: 700;
        color: #fff;
      }
      .weight-preview-segment {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 30px;
        transition: width 0.2s;
        white-space: nowrap;
      }
      .weight-preview-segment--fit { background: #8b1f1f; }
      .weight-preview-segment--completeness { background: #0ea5e9; }
      .weight-preview-segment--required { background: #8b1f1f; }
      .weight-preview-segment--nice { background: #8b5cf6; }
      .weight-preview-segment--exp { background: #f59e0b; }

      .formula-text {
        margin: 0;
        font-size: 0.78rem;
        color: var(--text-muted);
        font-style: italic;
        text-align: center;
      }

      .completeness-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 0.65rem;
        margin-bottom: 0.75rem;
      }
      .completeness-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .completeness-label {
        flex: 1;
        font-size: 0.82rem;
        font-weight: 500;
        color: var(--text);
      }
      .completeness-input {
        width: 54px;
        padding: 0.35rem 0.4rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 0.82rem;
        text-align: center;
        background: var(--panel);
        color: var(--text);
      }
      .completeness-input:focus {
        outline: none;
        border-color: var(--accent);
      }
      .completeness-unit {
        font-size: 0.72rem;
        color: #94a3b8;
      }
      .completeness-total {
        font-size: 0.82rem;
        color: var(--text-muted);
        text-align: right;
      }
      .completeness-warn {
        color: #f59e0b;
        font-style: italic;
        margin-left: 0.3rem;
      }

      .criterion-card {
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 0.85rem 1rem;
        margin-bottom: 0.75rem;
        background: var(--bg-hover);
      }
      .criterion-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.65rem;
      }
      .criterion-label {
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--accent);
      }
      .criterion-fields {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }
      .criterion-field label {
        display: block;
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--text-muted);
        margin-bottom: 0.2rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .criterion-field--row {
        display: flex;
        gap: 0.65rem;
      }
      .criterion-field--row > .criterion-field { flex: 1; }
      .criterion-input {
        width: 100%;
        padding: 0.4rem 0.6rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 0.82rem;
        background: var(--panel);
        color: var(--text);
      }
      .criterion-input:focus {
        outline: none;
        border-color: var(--accent);
      }
      .criterion-input--short { width: 70px; }
      .criterion-select {
        width: 100%;
        padding: 0.4rem 0.6rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 0.82rem;
        background: var(--panel);
        color: var(--text);
      }

      .keyword-list {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .keyword-row {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }

      .threshold-grid {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }
      .threshold-row {
        display: flex;
        align-items: center;
        gap: 0.65rem;
      }
      .threshold-row label {
        font-size: 0.82rem;
        color: var(--text-muted);
      }
      .threshold-badge {
        display: inline-block;
        width: 80px;
        text-align: center;
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
        flex-shrink: 0;
      }
      .threshold-badge--excellent { background: #dcfce7; color: #15803d; }
      .threshold-badge--good { background: #dbeafe; color: #1d4ed8; }
      .threshold-badge--fair { background: #fef3c7; color: #b45309; }
      .threshold-badge--poor { background: #fee2e2; color: #b91c1c; }
      .threshold-input {
        width: 60px;
        padding: 0.35rem 0.4rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 0.82rem;
        text-align: center;
        background: var(--panel);
        color: var(--text);
      }
      .threshold-input:focus {
        outline: none;
        border-color: var(--accent);
      }
      .threshold-fixed {
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--text);
      }

      @media (max-width: 600px) {
        .ai-config-page { padding: 1rem; }
        .action-bar { flex-direction: column; align-items: stretch; }
        .action-buttons { justify-content: stretch; }
        .action-buttons .btn { flex: 1; justify-content: center; }
        .weight-label { width: 100px; }
        .completeness-grid { grid-template-columns: 1fr; }
        .criterion-field--row { flex-direction: column; }
      }
    `,
  ],
})
export class AiEvaluationComponent implements OnInit {
  readonly icons = {
    brain: BrainCircuit,
    sliders: Sliders,
    settings: Settings2,
    save: Save,
    reset: RotateCcw,
    plus: Plus,
    trash: Trash2,
    close: X,
    sparkles: Sparkles,
    gauge: Gauge,
    chevron: ChevronDown,
  };

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly jobs = signal<JobPosting[]>([]);
  readonly selectedJobKey = signal<string | null>(null);

  readonly fitWeight = signal(DEFAULTS.fitWeight);
  readonly completenessWeight = signal(DEFAULTS.completenessWeight);
  readonly requiredSkillsWeight = signal(DEFAULTS.requiredSkillsWeight);
  readonly niceToHaveSkillsWeight = signal(DEFAULTS.niceToHaveSkillsWeight);
  readonly experienceWeight = signal(DEFAULTS.experienceWeight);
  readonly completenessPoints = signal<FullCompletenessPointsConfig>({ ...DEFAULTS.completenessPoints });
  readonly customCriteria = signal<CustomCriterion[]>([]);
  readonly qualityThresholds = signal<FullQualityThresholds>({ ...DEFAULTS.qualityThresholds });

  readonly dirty = signal(false);
  private serverConfig: FullEvaluationConfig | null = null;

  readonly selectedJob = computed(() => {
    const key = this.selectedJobKey();
    return this.jobs().find((j) => this.jobKey(j) === key) ?? null;
  });

  readonly mainWeightSum = computed(() => this.fitWeight() + this.completenessWeight());
  readonly fitSubWeightSum = computed(() =>
    this.requiredSkillsWeight() + this.niceToHaveSkillsWeight() + this.experienceWeight()
  );
  readonly completenessPointsTotal = computed(() => {
    const cp = this.completenessPoints();
    return cp.fullName + cp.email + cp.phone + cp.location + cp.links + cp.summary + cp.experience + cp.experienceDates + cp.education;
  });

  readonly previewScore = computed(() => {
    const fw = this.fitWeight();
    const cw = this.completenessWeight();
    const total = fw + cw;
    if (total === 0) return { fitPct: 50, completenessPct: 50 };
    return { fitPct: Math.round((fw / total) * 100), completenessPct: Math.round((cw / total) * 100) };
  });

  readonly fitSubPreview = computed(() => {
    const r = this.requiredSkillsWeight();
    const n = this.niceToHaveSkillsWeight();
    const e = this.experienceWeight();
    const total = r + n + e;
    if (total === 0) return { requiredPct: 34, nicePct: 33, expPct: 33 };
    return {
      requiredPct: Math.round((r / total) * 100),
      nicePct: Math.round((n / total) * 100),
      expPct: Math.round((e / total) * 100),
    };
  });

  readonly expandedSections = signal<Record<string, boolean>>({
    weights: true,
    fitSub: true,
    completeness: false,
    custom: false,
    thresholds: false,
  });

  readonly completenessFieldLabels: { key: keyof FullCompletenessPointsConfig; label: string }[] = [
    { key: 'fullName', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'location', label: 'Location' },
    { key: 'links', label: 'Links (CV)' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'portfolio', label: 'Portfolio / GitHub' },
    { key: 'summary', label: 'Summary' },
    { key: 'experience', label: 'Work Experience' },
    { key: 'experienceDates', label: 'Experience Dates' },
    { key: 'education', label: 'Education' },
    { key: 'competencies', label: 'Competencies' },
  ];

  constructor(private jobPostingService: JobPostingService) {}

  async ngOnInit() {
    try {
      this.loading.set(true);
      const jobs = await firstValueFrom(this.jobPostingService.getAll());
      this.jobs.set(jobs);
    } catch (e) {
      this.error.set(this.toErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  trackJob(_index: number, job: JobPosting): string {
    return this.jobKey(job);
  }

  trackField(_index: number, field: { key: keyof FullCompletenessPointsConfig; label: string }): string {
    return field.key;
  }

  trackCriterion(index: number, _item: CustomCriterion): number {
    return index;
  }

  trackKeyword(index: number, _item: string): number {
    return index;
  }

  jobKey(job: JobPosting): string {
    if (job.id != null) return String(job.id);
    if (job.documentId) return job.documentId;
    return '';
  }

  toggleSection(key: string) {
    this.expandedSections.update((s) => ({ ...s, [key]: !s[key] }));
  }

  isExpanded(key: string): boolean {
    return this.expandedSections()[key] ?? false;
  }

  async onSelectJob(jobKey: string | null) {
    if (!jobKey) return;
    this.selectedJobKey.set(jobKey);
    this.error.set(null);
    this.success.set(null);

    try {
      this.loading.set(true);
      const { evaluationConfig } = await firstValueFrom(this.jobPostingService.getEvalConfig(jobKey));
      this.serverConfig = this.normalizeConfig(evaluationConfig);
      this.applyConfig(this.serverConfig);
      this.dirty.set(false);
    } catch (e) {
      this.error.set(this.toErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  private applyConfig(cfg: FullEvaluationConfig) {
    this.fitWeight.set(cfg.fitWeight);
    this.completenessWeight.set(cfg.completenessWeight);
    this.requiredSkillsWeight.set(cfg.requiredSkillsWeight);
    this.niceToHaveSkillsWeight.set(cfg.niceToHaveSkillsWeight);
    this.experienceWeight.set(cfg.experienceWeight);
    this.completenessPoints.set({ ...cfg.completenessPoints });
    this.customCriteria.set(cfg.customCriteria.map((c) => ({ ...c, keywords: [...c.keywords] })));
    this.qualityThresholds.set({ ...cfg.qualityThresholds });
  }

  private buildConfig(): FullEvaluationConfig {
    return {
      fitWeight: this.fitWeight(),
      completenessWeight: this.completenessWeight(),
      requiredSkillsWeight: this.requiredSkillsWeight(),
      niceToHaveSkillsWeight: this.niceToHaveSkillsWeight(),
      experienceWeight: this.experienceWeight(),
      completenessPoints: { ...this.completenessPoints() },
      customCriteria: this.customCriteria().map((c) => ({ ...c, keywords: [...c.keywords] })),
      qualityThresholds: { ...this.qualityThresholds() },
    };
  }

  private normalizeConfig(cfg: EvaluationConfig | null | undefined): FullEvaluationConfig {
    const base = DEFAULTS;
    return {
      fitWeight: cfg?.fitWeight ?? base.fitWeight,
      completenessWeight: cfg?.completenessWeight ?? base.completenessWeight,
      requiredSkillsWeight: cfg?.requiredSkillsWeight ?? base.requiredSkillsWeight,
      niceToHaveSkillsWeight: cfg?.niceToHaveSkillsWeight ?? base.niceToHaveSkillsWeight,
      experienceWeight: cfg?.experienceWeight ?? base.experienceWeight,
      completenessPoints: {
        ...base.completenessPoints,
        ...(cfg?.completenessPoints ?? {}),
      },
      customCriteria: Array.isArray(cfg?.customCriteria)
        ? cfg!.customCriteria!.map((c) => ({ ...c, keywords: [...(c.keywords ?? [])] }))
        : [],
      qualityThresholds: {
        ...base.qualityThresholds,
        ...(cfg?.qualityThresholds ?? {}),
      },
    };
  }

  markDirty() {
    this.dirty.set(true);
    this.success.set(null);
  }

  onMainWeightChange(which: 'fit' | 'completeness', value: number) {
    const clamped = Math.max(0, Math.min(100, value));
    if (which === 'fit') {
      this.fitWeight.set(clamped);
      this.completenessWeight.set(100 - clamped);
    } else {
      this.completenessWeight.set(clamped);
      this.fitWeight.set(100 - clamped);
    }
    this.markDirty();
  }

  onFitSubWeightChange(which: 'required' | 'nice' | 'exp', value: number) {
    const clamped = Math.max(0, Math.min(100, value));
    if (which === 'required') this.requiredSkillsWeight.set(clamped);
    else if (which === 'nice') this.niceToHaveSkillsWeight.set(clamped);
    else this.experienceWeight.set(clamped);
    this.markDirty();
  }

  onCompletenessPointChange(field: keyof FullCompletenessPointsConfig, value: number) {
    const clamped = Math.max(0, Math.min(100, value));
    this.completenessPoints.update((cp) => ({ ...cp, [field]: clamped }));
    this.markDirty();
  }

  onThresholdChange(which: keyof FullQualityThresholds, value: number) {
    const clamped = Math.max(0, Math.min(100, value));
    this.qualityThresholds.update((qt) => ({ ...qt, [which]: clamped }));
    this.markDirty();
  }

  addCriterion() {
    this.customCriteria.update((list) => [
      ...list,
      { name: '', type: 'bonus', points: 5, keywords: [''], requireAll: false },
    ]);
    this.markDirty();
    if (!this.isExpanded('custom')) this.toggleSection('custom');
  }

  removeCriterion(index: number) {
    this.customCriteria.update((list) => list.filter((_, i) => i !== index));
    this.markDirty();
  }

  updateCriterion(index: number, patch: Partial<CustomCriterion>) {
    this.customCriteria.update((list) =>
      list.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
    this.markDirty();
  }

  addKeyword(criterionIndex: number) {
    this.customCriteria.update((list) =>
      list.map((c, i) => (i === criterionIndex ? { ...c, keywords: [...c.keywords, ''] } : c))
    );
    this.markDirty();
  }

  removeKeyword(criterionIndex: number, kwIndex: number) {
    this.customCriteria.update((list) =>
      list.map((c, i) =>
        i === criterionIndex ? { ...c, keywords: c.keywords.filter((_, ki) => ki !== kwIndex) } : c
      )
    );
    this.markDirty();
  }

  updateKeyword(criterionIndex: number, kwIndex: number, value: string) {
    this.customCriteria.update((list) =>
      list.map((c, i) =>
        i === criterionIndex
          ? { ...c, keywords: c.keywords.map((kw, ki) => (ki === kwIndex ? value : kw)) }
          : c
      )
    );
    this.markDirty();
  }

  resetToDefaults() {
    this.applyConfig(DEFAULTS);
    this.markDirty();
  }

  async save() {
    const jobKey = this.selectedJobKey();
    if (!jobKey || this.saving()) return;

    try {
      this.saving.set(true);
      this.error.set(null);
      this.success.set(null);
      const config = this.buildConfig();
      const saved = await firstValueFrom(this.jobPostingService.setEvalConfig(jobKey, config));
      this.serverConfig = this.normalizeConfig(saved.evaluationConfig);
      this.applyConfig(this.serverConfig);
      this.dirty.set(false);
      this.success.set('Evaluation configuration saved. Reprocess candidates to apply the new scoring.');
    } catch (e) {
      this.error.set(this.toErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unexpected error.';
    }
  }
}
