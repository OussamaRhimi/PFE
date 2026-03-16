import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { JobPostingService, JobPostingPayload, Requirements, emptyRequirements } from '../../services/job-posting.service';
import { SkillService, Skill } from '../../services/skill.service';
import { DepartmentService, Department } from '../../services/department.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-job-posting-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <h1>{{ isEdit ? i18n.t('form.editTitle') : i18n.t('form.newTitle') }}</h1>
        <a routerLink="/job-postings" class="back-link">{{ i18n.t('form.backToList') }}</a>
      </div>

      <div class="alert error" *ngIf="error">{{ error }}<button (click)="error=''">&times;</button></div>
      <div class="alert success" *ngIf="success">{{ success }}<button (click)="success=''">&times;</button></div>

      <form (ngSubmit)="save()" class="form-card">
        <div class="field">
          <label>{{ i18n.t('form.titleLabel') }}</label>
          <input type="text" [(ngModel)]="form.title" name="title" required [placeholder]="i18n.t('form.titlePlaceholder')" />
        </div>

        <div class="field">
          <label>{{ i18n.t('form.descLabel') }}</label>
          <textarea [(ngModel)]="form.description" name="description" rows="4" [placeholder]="i18n.t('form.descPlaceholder')"></textarea>
        </div>

        <!-- Requirements value-object -->
        <fieldset class="requirements-fieldset">
          <legend>{{ i18n.t('form.requirements') }}</legend>

          <!-- Skills Required -->
          <div class="chip-field">
            <label>{{ i18n.t('form.skillsRequired') }}</label>
            <div class="chip-list" *ngIf="reqs.skillsRequired.length">
              <span class="chip" *ngFor="let s of reqs.skillsRequired; let i = index">
                {{ s }}
                <button type="button" class="chip-x" (click)="removeTag('skillsRequired', i)">&times;</button>
              </span>
            </div>
            <select (change)="onSelect('skillsRequired', $event)">
              <option value="" selected>{{ i18n.t('form.addSkillRequired') }}</option>
              <option *ngFor="let s of availableSkills('skillsRequired')" [value]="s.name">{{ s.name }}</option>
            </select>
          </div>

          <!-- Skills Nice-to-Have -->
          <div class="chip-field">
            <label>{{ i18n.t('form.skillsNice') }}</label>
            <div class="chip-list" *ngIf="reqs.skillsNiceToHave.length">
              <span class="chip chip-nice" *ngFor="let s of reqs.skillsNiceToHave; let i = index">
                {{ s }}
                <button type="button" class="chip-x" (click)="removeTag('skillsNiceToHave', i)">&times;</button>
              </span>
            </div>
            <select (change)="onSelect('skillsNiceToHave', $event)">
              <option value="" selected>{{ i18n.t('form.addSkillNice') }}</option>
              <option *ngFor="let s of availableSkills('skillsNiceToHave')" [value]="s.name">{{ s.name }}</option>
            </select>
          </div>

          <!-- Departments -->
          <div class="chip-field">
            <label>{{ i18n.t('form.departments') }}</label>
            <div class="chip-list" *ngIf="reqs.departments.length">
              <span class="chip chip-dept" *ngFor="let d of reqs.departments; let i = index">
                {{ d }}
                <button type="button" class="chip-x" (click)="removeTag('departments', i)">&times;</button>
              </span>
            </div>
            <select (change)="onSelect('departments', $event)">
              <option value="" selected>{{ i18n.t('form.addDepartment') }}</option>
              <option *ngFor="let d of availableDepartments()" [value]="d.name">{{ d.name }}</option>
            </select>
          </div>

          <!-- Min Years Experience -->
          <div class="field">
            <label>{{ i18n.t('form.minYears') }}</label>
            <input type="number" [(ngModel)]="reqs.minYearsExperience" name="minYears" min="0" [placeholder]="i18n.t('form.minYearsPlaceholder')" />
          </div>

          <!-- Notes -->
          <div class="field">
            <label>{{ i18n.t('form.notes') }}</label>
            <textarea [(ngModel)]="reqs.notes" name="reqNotes" rows="3" [placeholder]="i18n.t('form.notesPlaceholder')"></textarea>
          </div>
        </fieldset>

        <div class="form-actions">
          <button type="submit" class="btn-primary" [disabled]="!form.title.trim() || saving">
            {{ saving ? i18n.t('form.saving') : (isEdit ? i18n.t('form.update') : i18n.t('form.create')) }}
          </button>
          <a routerLink="/job-postings" class="btn-secondary">{{ i18n.t('form.cancel') }}</a>
        </div>
      </form>
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
      max-width: 720px;
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
    .back-link {
      text-decoration: none;
      color: $logo-red;
      font-size: 13.5px;
      font-weight: 600;
      transition: color 0.2s;
    }
    .back-link:hover { color: $logo-red-deep; }

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

    .form-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      padding: 32px;
      border-radius: 20px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
      border: 1px solid $gray-200;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 32px;
        right: 32px;
        height: 3px;
        background: linear-gradient(90deg, transparent, $logo-red-deep, $logo-red-mid, transparent);
        border-radius: 0 0 4px 4px;
      }
    }

    .field { margin-bottom: 22px; }
    .field label {
      display: block;
      font-size: 12.5px;
      font-weight: 700;
      color: $gray-700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      margin-bottom: 8px;
    }
    .field input, .field select, .field textarea {
      width: 100%;
      padding: 12px 16px;
      border: 1.5px solid $gray-200;
      border-radius: 12px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
      background: white;
      color: $gray-800;
      transition: all 0.25s;
    }
    .field input:focus, .field select:focus, .field textarea:focus {
      border-color: $logo-red-deep;
      box-shadow: 0 0 0 3px rgba($logo-red-deep, 0.08);
    }
    .field textarea { resize: vertical; min-height: 100px; }

    /* Requirements fieldset */
    .requirements-fieldset {
      border: 1.5px solid $gray-200;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 22px;
      background: $gray-50;
    }
    .requirements-fieldset legend {
      font-size: 12.5px;
      font-weight: 700;
      color: $logo-red;
      padding: 0 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    /* Chip-picker */
    .chip-field { margin-bottom: 20px; }
    .chip-field > label {
      display: block;
      font-size: 12.5px;
      font-weight: 700;
      color: $gray-700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      margin-bottom: 8px;
    }
    .chip-field > select {
      width: 100%;
      padding: 11px 14px;
      border: 1.5px solid $gray-200;
      border-radius: 12px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
      color: $gray-600;
      background: white;
      cursor: pointer;
      transition: all 0.25s;
    }
    .chip-field > select:focus {
      border-color: $logo-red-deep;
      box-shadow: 0 0 0 3px rgba($logo-red-deep, 0.08);
    }

    .chip-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      background: rgba($logo-red, 0.08);
      color: $logo-red-deep;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      animation: chipIn 0.15s ease;
    }
    .chip-nice {
      background: rgba(#b45309, 0.08);
      color: #92400e;
    }
    .chip-nice .chip-x { color: #b45309; }
    .chip-nice .chip-x:hover { color: $error; }
    .chip-dept {
      background: rgba(#166534, 0.08);
      color: #166534;
    }
    .chip-dept .chip-x { color: #16a34a; }
    .chip-dept .chip-x:hover { color: $error; }

    .chip-x {
      background: none;
      border: none;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      color: $logo-red;
      padding: 0 2px;
      transition: color 0.15s;
    }
    .chip-x:hover { color: $error; }

    @keyframes chipIn {
      from { opacity: 0; transform: scale(0.85); }
      to   { opacity: 1; transform: scale(1); }
    }

    /* Actions */
    .form-actions { display: flex; gap: 12px; margin-top: 28px; }
    .btn-primary {
      flex: 1;
      padding: 13px;
      background: linear-gradient(135deg, $logo-red-deep, $logo-red);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.25s;
      box-shadow: 0 4px 14px rgba($logo-red, 0.2);
    }
    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, $logo-red-mid, $logo-red-deep);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba($logo-red, 0.3);
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary {
      flex: 1;
      padding: 13px;
      background: $gray-100;
      color: $gray-600;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-secondary:hover { background: $gray-200; }
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

  constructor(
    private jobService: JobPostingService,
    private skillService: SkillService,
    private departmentService: DepartmentService,
    private router: Router,
    private route: ActivatedRoute,
    public i18n: I18nService,
  ) { }

  ngOnInit(): void {
    // Load skills and departments for dropdowns
    this.skillService.getAll().subscribe({ next: (s) => this.skills = s });
    this.departmentService.getAll().subscribe({ next: (d) => this.departments = d });

    // Check if editing
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

  /** Called when user picks from a dropdown — adds the chip and resets the select */
  onSelect(field: 'skillsRequired' | 'skillsNiceToHave' | 'departments', event: Event): void {
    const sel = event.target as HTMLSelectElement;
    this.addTag(field, sel.value);
    sel.value = ''; // reset to placeholder
  }

  /** Skills not yet chosen for the given field */
  availableSkills(field: 'skillsRequired' | 'skillsNiceToHave'): Skill[] {
    return this.skills.filter(s => !this.reqs[field].includes(s.name));
  }

  /** Departments not yet chosen */
  availableDepartments(): Department[] {
    return this.departments.filter(d => !this.reqs.departments.includes(d.name));
  }

  save(): void {
    if (!this.form.title?.trim()) return;
    this.saving = true;
    this.error = '';

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
