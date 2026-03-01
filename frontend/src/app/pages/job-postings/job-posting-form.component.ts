import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { JobPostingService, JobPostingPayload, Requirements, emptyRequirements } from '../../services/job-posting.service';
import { SkillService, Skill } from '../../services/skill.service';
import { DepartmentService, Department } from '../../services/department.service';

@Component({
  selector: 'app-job-posting-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <h1>{{ isEdit ? 'Edit' : 'New' }} Job Posting</h1>
        <a routerLink="/job-postings" class="back-link">&larr; Back to list</a>
      </div>

      <div class="alert error" *ngIf="error">{{ error }}<button (click)="error=''">&times;</button></div>
      <div class="alert success" *ngIf="success">{{ success }}<button (click)="success=''">&times;</button></div>

      <form (ngSubmit)="save()" class="form-card">
        <div class="field">
          <label>Title *</label>
          <input type="text" [(ngModel)]="form.title" name="title" required placeholder="Job title" />
        </div>

        <div class="field">
          <label>Description</label>
          <textarea [(ngModel)]="form.description" name="description" rows="4" placeholder="Job description..."></textarea>
        </div>

        <!-- Requirements value-object -->
        <fieldset class="requirements-fieldset">
          <legend>Requirements</legend>

          <!-- Skills Required -->
          <div class="chip-field">
            <label>Skills Required</label>
            <div class="chip-list" *ngIf="reqs.skillsRequired.length">
              <span class="chip" *ngFor="let s of reqs.skillsRequired; let i = index">
                {{ s }}
                <button type="button" class="chip-x" (click)="removeTag('skillsRequired', i)">&times;</button>
              </span>
            </div>
            <select (change)="onSelect('skillsRequired', $event)">
              <option value="" selected>— Add a required skill —</option>
              <option *ngFor="let s of availableSkills('skillsRequired')" [value]="s.name">{{ s.name }}</option>
            </select>
          </div>

          <!-- Skills Nice-to-Have -->
          <div class="chip-field">
            <label>Skills Nice-to-Have</label>
            <div class="chip-list" *ngIf="reqs.skillsNiceToHave.length">
              <span class="chip chip-nice" *ngFor="let s of reqs.skillsNiceToHave; let i = index">
                {{ s }}
                <button type="button" class="chip-x" (click)="removeTag('skillsNiceToHave', i)">&times;</button>
              </span>
            </div>
            <select (change)="onSelect('skillsNiceToHave', $event)">
              <option value="" selected>— Add a nice-to-have skill —</option>
              <option *ngFor="let s of availableSkills('skillsNiceToHave')" [value]="s.name">{{ s.name }}</option>
            </select>
          </div>

          <!-- Departments -->
          <div class="chip-field">
            <label>Departments</label>
            <div class="chip-list" *ngIf="reqs.departments.length">
              <span class="chip chip-dept" *ngFor="let d of reqs.departments; let i = index">
                {{ d }}
                <button type="button" class="chip-x" (click)="removeTag('departments', i)">&times;</button>
              </span>
            </div>
            <select (change)="onSelect('departments', $event)">
              <option value="" selected>— Add a department —</option>
              <option *ngFor="let d of availableDepartments()" [value]="d.name">{{ d.name }}</option>
            </select>
          </div>

          <!-- Min Years Experience -->
          <div class="field">
            <label>Min. Years of Experience</label>
            <input type="number" [(ngModel)]="reqs.minYearsExperience" name="minYears" min="0" placeholder="e.g. 3" />
          </div>

          <!-- Notes -->
          <div class="field">
            <label>Notes</label>
            <textarea [(ngModel)]="reqs.notes" name="reqNotes" rows="3" placeholder="Additional requirement notes..."></textarea>
          </div>
        </fieldset>

        <div class="form-actions">
          <button type="submit" class="btn-primary" [disabled]="!form.title.trim() || saving">
            {{ saving ? 'Saving...' : (isEdit ? 'Update' : 'Create') }}
          </button>
          <a routerLink="/job-postings" class="btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page { max-width: 700px; margin: 30px auto; padding: 0 20px; font-family: 'Segoe UI', sans-serif; }

    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; color: #333; }
    .back-link { text-decoration: none; color: #4f46e5; font-size: 14px; }
    .back-link:hover { text-decoration: underline; }

    .alert { display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 14px; }
    .alert button { background: none; border: none; font-size: 18px; cursor: pointer; }
    .alert.error { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
    .alert.success { background: #dcfce7; color: #16a34a; border: 1px solid #86efac; }

    .form-card {
      background: #fff; padding: 28px; border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;
    }

    .field { margin-bottom: 20px; }
    .field label { display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 6px; }
    .field input, .field select, .field textarea {
      width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px;
      font-size: 14px; font-family: inherit; outline: none; box-sizing: border-box;
    }
    .field input:focus, .field select:focus, .field textarea:focus {
      border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79,70,229,0.12);
    }
    .field textarea { resize: vertical; }

    /* Requirements fieldset */
    .requirements-fieldset {
      border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;
    }
    .requirements-fieldset legend {
      font-size: 15px; font-weight: 600; color: #4f46e5; padding: 0 8px;
    }

    /* Chip-picker */
    .chip-field { margin-bottom: 18px; }
    .chip-field > label { display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 6px; }
    .chip-field > select {
      width: 100%; padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 6px;
      font-size: 14px; font-family: inherit; outline: none; box-sizing: border-box;
      color: #555; background: #fff; cursor: pointer;
    }
    .chip-field > select:focus { border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79,70,229,0.12); }

    .chip-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 5px 10px; background: #e0e7ff; color: #4338ca; border-radius: 16px;
      font-size: 13px; font-weight: 500; animation: chipIn .15s ease;
    }
    .chip-nice { background: #fef3c7; color: #92400e; }
    .chip-nice .chip-x { color: #b45309; }
    .chip-nice .chip-x:hover { color: #dc2626; }
    .chip-dept { background: #dcfce7; color: #166534; }
    .chip-dept .chip-x { color: #16a34a; }
    .chip-dept .chip-x:hover { color: #dc2626; }

    .chip-x {
      background: none; border: none; font-size: 16px; line-height: 1;
      cursor: pointer; color: #6366f1; padding: 0 2px; transition: color .15s;
    }
    .chip-x:hover { color: #dc2626; }

    @keyframes chipIn {
      from { opacity: 0; transform: scale(.85); }
      to   { opacity: 1; transform: scale(1); }
    }

    /* Actions */
    .form-actions { display: flex; gap: 12px; margin-top: 24px; }
    .btn-primary {
      flex: 1; padding: 12px; background: #4f46e5; color: #fff; border: none;
      border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;
    }
    .btn-primary:hover:not(:disabled) { background: #4338ca; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary {
      flex: 1; padding: 12px; background: #f3f4f6; color: #666; border: none;
      border-radius: 6px; font-size: 14px; text-align: center; text-decoration: none; cursor: pointer;
    }
    .btn-secondary:hover { background: #e5e7eb; }
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
  ) {}

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
        error: () => { this.error = 'Failed to load job posting.'; }
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
        this.error = err?.error?.error?.message || 'Failed to save job posting.';
        this.saving = false;
      }
    });
  }
}
