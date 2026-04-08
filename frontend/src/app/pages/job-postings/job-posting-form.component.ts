import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { JobPostingService, JobPostingPayload, Requirements, emptyRequirements } from '../../services/job-posting.service';
import { SkillService, Skill } from '../../services/skill.service';
import { DepartmentService, Department } from '../../services/department.service';
import { I18nService } from '../../services/i18n.service';

type JobMeta = {
  location: string;
  employmentType: string;
  customNotes: string;
  departments: string[];
};

function toStringList(value: string): string[] {
  return value
    .split(/[,\n]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseJobNotes(notes: string | null | undefined): JobMeta {
  const meta: JobMeta = { location: '', employmentType: '', customNotes: '', departments: [] };
  if (!notes || typeof notes !== 'string') return meta;

  const extra: string[] = [];
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
      continue;
    }
    extra.push(line);
  }

  meta.customNotes = extra.join('\n');
  return meta;
}

function composeJobNotes(meta: { location: string; employmentType: string; customNotes: string }): string {
  const lines: string[] = [];
  if (meta.location.trim()) lines.push(`Location: ${meta.location.trim()}`);
  if (meta.employmentType.trim()) lines.push(`Type: ${meta.employmentType.trim()}`);
  if (meta.customNotes.trim()) lines.push(meta.customNotes.trim());
  return lines.join('\n');
}

@Component({
  selector: 'app-job-posting-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="container hr-job-form-page">
      <div class="hr-jobs-head">
        <div>
          <h1>{{ isEdit ? i18n.t('form.editTitle') : i18n.t('form.newTitle') }}</h1>
          <p class="muted">{{ i18n.t('form.subtitle') }}</p>
        </div>
        <a routerLink="/job-postings" class="btn btn--ghost">{{ i18n.t('form.backToList') }}</a>
      </div>

      <div class="alert alert--error" *ngIf="error">{{ error }}</div>
      <div class="alert alert--success" *ngIf="success">{{ success }}</div>

      <form (ngSubmit)="save()" class="card hr-job-form">
        <label class="field">
          <span class="field__label">{{ i18n.t('form.titleLabel') }}</span>
          <input class="input" type="text" [(ngModel)]="form.title" name="title" required [placeholder]="i18n.t('form.titlePlaceholder')" />
        </label>

        <label class="field">
          <span class="field__label">{{ i18n.t('form.descLabel') }}</span>
          <textarea class="input" [(ngModel)]="form.description" name="description" rows="4" [placeholder]="i18n.t('form.descPlaceholder')"></textarea>
        </label>

        <fieldset class="job-requirements">
          <legend>{{ i18n.t('form.requirements') }}</legend>

          <div class="chip-field">
            <span class="field__label">{{ i18n.t('form.departments') }}</span>
            <input
              class="input"
              type="search"
              [value]="departmentQuery"
              (input)="departmentQuery = $any($event.target).value"
              (keydown.enter)="addFirstDepartmentMatch(); $event.preventDefault()"
              [placeholder]="i18n.t('form.searchDepartments')"
            />
            <div class="hr-job-suggest-list">
              <button
                class="hr-job-suggest hr-job-suggest--department"
                type="button"
                *ngFor="let name of filteredDepartmentOptions()"
                (click)="addDepartment(name)"
              >
                {{ name }}
              </button>
              <span class="muted small" *ngIf="filteredDepartmentOptions().length === 0">
                {{ i18n.t('form.noDepartmentMatch') }}
              </span>
            </div>
            <div class="hr-job-picked-list">
              <button
                class="hr-job-picked hr-job-picked--department"
                type="button"
                *ngFor="let name of reqs.departments; let i = index"
                (click)="removeTag('departments', i)"
              >
                <span>{{ name }}</span>
                <span aria-hidden="true">x</span>
              </button>
              <span class="muted small" *ngIf="reqs.departments.length === 0">
                {{ i18n.t('form.noDepartmentSelected') }}
              </span>
            </div>
          </div>

          <div class="grid2">
            <label class="field">
              <span class="field__label">{{ i18n.t('form.locationLabel') }}</span>
              <input class="input" type="text" [(ngModel)]="location" name="location" [placeholder]="i18n.t('form.locationPlaceholder')" />
            </label>
            <label class="field">
              <span class="field__label">{{ i18n.t('form.typeLabel') }}</span>
              <input class="input" type="text" [(ngModel)]="employmentType" name="employmentType" [placeholder]="i18n.t('form.typePlaceholder')" />
            </label>
          </div>

          <div class="chip-field">
            <span class="field__label">{{ i18n.t('form.skillsRequired') }}</span>
            <input
              class="input"
              type="search"
              [value]="requiredSkillQuery"
              (input)="requiredSkillQuery = $any($event.target).value"
              (keydown.enter)="addFirstSkillMatch('skillsRequired'); $event.preventDefault()"
              [placeholder]="i18n.t('form.searchRequiredSkills')"
            />
            <div class="hr-job-suggest-list">
              <button
                class="hr-job-suggest hr-job-suggest--required"
                type="button"
                *ngFor="let name of filteredSkillOptions('skillsRequired')"
                (click)="addSkill('skillsRequired', name)"
              >
                {{ name }}
              </button>
              <span class="muted small" *ngIf="filteredSkillOptions('skillsRequired').length === 0">
                {{ i18n.t('form.noSkillMatch') }}
              </span>
            </div>
            <div class="hr-job-picked-list">
              <button
                class="hr-job-picked hr-job-picked--required"
                type="button"
                *ngFor="let name of reqs.skillsRequired; let i = index"
                (click)="removeTag('skillsRequired', i)"
              >
                <span>{{ name }}</span>
                <span aria-hidden="true">x</span>
              </button>
              <span class="muted small" *ngIf="reqs.skillsRequired.length === 0">
                {{ i18n.t('form.noRequiredSkillSelected') }}
              </span>
            </div>
          </div>

          <div class="chip-field">
            <span class="field__label">{{ i18n.t('form.skillsNice') }}</span>
            <input
              class="input"
              type="search"
              [value]="niceSkillQuery"
              (input)="niceSkillQuery = $any($event.target).value"
              (keydown.enter)="addFirstSkillMatch('skillsNiceToHave'); $event.preventDefault()"
              [placeholder]="i18n.t('form.searchNiceSkills')"
            />
            <div class="hr-job-suggest-list">
              <button
                class="hr-job-suggest hr-job-suggest--nice"
                type="button"
                *ngFor="let name of filteredSkillOptions('skillsNiceToHave')"
                (click)="addSkill('skillsNiceToHave', name)"
              >
                {{ name }}
              </button>
              <span class="muted small" *ngIf="filteredSkillOptions('skillsNiceToHave').length === 0">
                {{ i18n.t('form.noSkillMatch') }}
              </span>
            </div>
            <div class="hr-job-picked-list">
              <button
                class="hr-job-picked hr-job-picked--nice"
                type="button"
                *ngFor="let name of reqs.skillsNiceToHave; let i = index"
                (click)="removeTag('skillsNiceToHave', i)"
              >
                <span>{{ name }}</span>
                <span aria-hidden="true">x</span>
              </button>
              <span class="muted small" *ngIf="reqs.skillsNiceToHave.length === 0">
                {{ i18n.t('form.noNiceSkillSelected') }}
              </span>
            </div>
          </div>

          <div class="grid2">
            <label class="field">
              <span class="field__label">{{ i18n.t('form.minYears') }}</span>
              <input class="input" type="number" [(ngModel)]="reqs.minYearsExperience" name="minYears" min="0" [placeholder]="i18n.t('form.minYearsPlaceholder')" />
            </label>

            <label class="field">
              <span class="field__label">{{ i18n.t('form.notes') }}</span>
              <textarea class="input" [(ngModel)]="customNotes" name="reqNotes" rows="3" [placeholder]="i18n.t('form.notesPlaceholder')"></textarea>
            </label>
          </div>
        </fieldset>

        <div class="form-actions">
          <button type="submit" class="btn btn--primary" [disabled]="!form.title.trim() || saving">
            {{ saving ? i18n.t('form.saving') : (isEdit ? i18n.t('form.update') : i18n.t('form.create')) }}
          </button>
          <a routerLink="/job-postings" class="btn btn--ghost">{{ i18n.t('form.cancel') }}</a>
        </div>
      </form>
    </section>
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
      max-width: 980px;
      width: 100%;
      margin: 0 auto;
      padding: 24px 16px 50px;
      box-sizing: border-box;
    }

    .hr-jobs-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 16px;
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

    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 22px;
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

    .alert {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 10px;
      padding: 10px 12px;
      margin: 12px 0;
    }

    .alert--error {
      border-color: var(--danger-soft-border);
      background: var(--danger-soft-bg);
    }

    .alert--success {
      border-color: var(--ok-soft-border);
      background: var(--ok-soft-bg);
    }

    .field {
      display: grid;
      gap: 6px;
    }

    .field__label {
      font-size: 13px;
      color: var(--muted);
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

    textarea.input {
      resize: vertical;
      min-height: 90px;
    }

    .hr-job-form {
      display: grid;
      gap: 14px;
    }

    .job-requirements {
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px;
      display: grid;
      gap: 14px;
      background: var(--panel-2);
    }

    .job-requirements legend {
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
      padding: 0 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .grid2 {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }

    @media (min-width: 760px) {
      .grid2 {
        grid-template-columns: 1fr 1fr;
      }
    }

    .chip-field {
      display: grid;
      gap: 8px;
    }

    .hr-job-suggest-list {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      max-height: 116px;
      overflow: auto;
    }

    .hr-job-picked-list {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .hr-job-suggest {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      border: 1px solid transparent;
      padding: 5px 11px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .hr-job-suggest--department {
      background: #e0f2fe;
      border-color: #7dd3fc;
      color: #0c4a6e;
    }

    .hr-job-suggest--required {
      background: #fee2e2;
      border-color: #fca5a5;
      color: #991b1b;
    }

    .hr-job-suggest--nice {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: #334155;
    }

    .hr-job-picked {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: 999px;
      border: 1px solid transparent;
      padding: 5px 11px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .hr-job-picked--department {
      background: #eff6ff;
      border-color: #93c5fd;
      color: #1e40af;
    }

    .hr-job-picked--required {
      background: #fef2f2;
      border-color: #fecaca;
      color: #b91c1c;
    }

    .hr-job-picked--nice {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #334155;
    }

    .form-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    @media (max-width: 820px) {
      .hr-jobs-head {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class JobPostingFormComponent implements OnInit {
  isEdit = false;
  saving = false;
  error = '';
  success = '';
  documentId = '';

  form: JobPostingPayload = { title: '', description: '' };
  reqs: Requirements = emptyRequirements();
  skills: Skill[] = [];
  departments: Department[] = [];
  departmentQuery = '';
  requiredSkillQuery = '';
  niceSkillQuery = '';
  location = '';
  employmentType = '';
  customNotes = '';

  constructor(
    private jobService: JobPostingService,
    private skillService: SkillService,
    private departmentService: DepartmentService,
    private router: Router,
    private route: ActivatedRoute,
    public i18n: I18nService,
  ) { }

  ngOnInit(): void {
    this.skillService.getAll().subscribe({ next: (s) => this.skills = s });
    this.departmentService.getAll().subscribe({ next: (d) => this.departments = d });

    this.documentId = this.route.snapshot.paramMap.get('id') || '';
    if (this.documentId) {
      this.isEdit = true;
      this.jobService.getOne(this.documentId).subscribe({
        next: (job) => {
          this.form = {
            title: job.title,
            description: job.description || '',
          };
          this.reqs = job.requirements
            ? { ...emptyRequirements(), ...job.requirements }
            : emptyRequirements();

          const meta = parseJobNotes(this.reqs.notes);
          if (this.reqs.departments.length === 0 && meta.departments.length > 0) {
            this.reqs.departments = meta.departments;
          }
          this.location = meta.location;
          this.employmentType = meta.employmentType;
          this.customNotes = meta.customNotes;
        },
        error: () => { this.error = this.i18n.t('form.loadError'); }
      });
    }
  }

  addTag(field: 'skillsRequired' | 'skillsNiceToHave' | 'departments', value: string): void {
    if (!value || this.reqs[field].includes(value)) return;
    this.reqs[field].push(value);
  }

  removeTag(field: 'skillsRequired' | 'skillsNiceToHave' | 'departments', index: number): void {
    this.reqs[field].splice(index, 1);
  }

  private filterOptions(options: string[], query: string, selected: string[]): string[] {
    const needle = query.trim().toLowerCase();
    const selectedKeys = new Set(selected.map((value) => value.toLowerCase()));
    return options
      .filter((option) => !selectedKeys.has(option.toLowerCase()))
      .filter((option) => (needle ? option.toLowerCase().includes(needle) : true))
      .slice(0, 12);
  }

  filteredDepartmentOptions(): string[] {
    const options = this.departments.map((dept) => dept.name);
    return this.filterOptions(options, this.departmentQuery, this.reqs.departments);
  }

  filteredSkillOptions(field: 'skillsRequired' | 'skillsNiceToHave'): string[] {
    const options = this.skills.map((skill) => skill.name);
    const query = field === 'skillsRequired' ? this.requiredSkillQuery : this.niceSkillQuery;
    return this.filterOptions(options, query, this.reqs[field]);
  }

  addDepartment(name: string): void {
    this.addTag('departments', name);
    this.departmentQuery = '';
  }

  addSkill(field: 'skillsRequired' | 'skillsNiceToHave', name: string): void {
    this.addTag(field, name);
    if (field === 'skillsRequired') this.requiredSkillQuery = '';
    if (field === 'skillsNiceToHave') this.niceSkillQuery = '';
  }

  addFirstDepartmentMatch(): void {
    const first = this.filteredDepartmentOptions()[0];
    if (first) this.addDepartment(first);
  }

  addFirstSkillMatch(field: 'skillsRequired' | 'skillsNiceToHave'): void {
    const first = this.filteredSkillOptions(field)[0];
    if (first) this.addSkill(field, first);
  }

  save(): void {
    if (!this.form.title?.trim()) return;
    this.saving = true;
    this.error = '';

    this.reqs.notes = composeJobNotes({
      location: this.location,
      employmentType: this.employmentType,
      customNotes: this.customNotes,
    });

    const payload: JobPostingPayload = {
      ...this.form,
      requirements: { ...this.reqs },
    };

    const obs = this.isEdit
      ? this.jobService.update(this.documentId, payload)
      : this.jobService.create(payload);

    obs.subscribe({
      next: () => {
        this.router.navigate(['/job-postings']);
      },
      error: (err) => {
        this.error = err?.error?.error?.message || this.i18n.t('form.saveError');
        this.saving = false;
      }
    });
  }
}
