import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SkillService, Skill } from '../../services/skill.service';
import { SkillAutocompleteComponent } from '../../components/skill-autocomplete/skill-autocomplete.component';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SkillAutocompleteComponent],
  template: `
    <div class="skills-page">
      <div class="header">
        <h1>{{ i18n.t('skills.title') }}</h1>
        <a routerLink="/dashboard" class="back-link">{{ i18n.t('skills.backToDashboard') }}</a>
      </div>

      <!-- Messages -->
      <div class="alert error" *ngIf="error">
        {{ error }}
        <button (click)="error = ''">&times;</button>
      </div>
      <div class="alert success" *ngIf="success">
        {{ success }}
        <button (click)="success = ''">&times;</button>
      </div>

      <!-- Add skill -->
      <div class="add-row">
        <input
          type="text"
          [(ngModel)]="newName"
          [placeholder]="i18n.t('skills.placeholder')"
          (keyup.enter)="addSkill()"
        />
        <button class="btn-add" (click)="addSkill()" [disabled]="!newName.trim()">{{ i18n.t('skills.add') }}</button>
      </div>

      <!-- Search bar using Reusable Autocomplete -->
      <div class="search-bar">
        <app-skill-autocomplete
          [initialValue]="searchQuery"
          (searchResults)="onSearchResults($event)"
          (searchCleared)="onSearchCleared()"
          (queryChange)="onQueryChange($event)"
          (skillSelected)="onSkillSelected($event)"
          [placeholder]="i18n.t('skills.searchPlaceholder')"
        ></app-skill-autocomplete>
        
        <span class="search-count" *ngIf="searchQuery && !loading">
          {{ searchResults.length }} {{ searchResults.length !== 1 ? i18n.t('skills.results') : i18n.t('skills.result') }}
        </span>
      </div>

      <!-- Loading (initial) -->
      <p class="center" *ngIf="loading && !searchQuery">{{ i18n.t('skills.loading') }}</p>

      <!-- ── SEARCH RESULTS ── -->
      <ng-container *ngIf="searchQuery">
        <p class="center" *ngIf="!loading && searchResults.length === 0">
          {{ i18n.t('skills.noResults') }} "<strong>{{ searchQuery }}</strong>".
        </p>
        <div class="list" *ngIf="!loading && searchResults.length > 0">
          <div class="row search-result-row" *ngFor="let skill of searchResults">
            <span class="name" [innerHTML]="highlight(skill.name, searchQuery)"></span>
            <div class="actions">
              <button class="btn-edit" (click)="startEdit(skill)">{{ i18n.t('skills.edit') }}</button>
              <button class="btn-delete" (click)="remove(skill)">{{ i18n.t('skills.delete') }}</button>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ── ALL SKILLS LIST ── -->
      <ng-container *ngIf="!searchQuery">
        <p class="center" *ngIf="!loading && skills.length === 0">{{ i18n.t('skills.empty') }}</p>
        <div class="list" *ngIf="!loading && skills.length > 0">
          <div class="row" *ngFor="let skill of skills">
            <!-- View mode -->
            <ng-container *ngIf="editingId !== skill.documentId">
              <span class="name">{{ skill.name }}</span>
              <div class="actions">
                <button class="btn-edit" (click)="startEdit(skill)">{{ i18n.t('skills.edit') }}</button>
                <button class="btn-delete" (click)="remove(skill)">{{ i18n.t('skills.delete') }}</button>
              </div>
            </ng-container>

            <!-- Edit mode -->
            <ng-container *ngIf="editingId === skill.documentId">
              <input
                type="text"
                [(ngModel)]="editName"
                (keyup.enter)="saveEdit()"
                class="edit-input"
              />
              <div class="actions">
                <button class="btn-save" (click)="saveEdit()" [disabled]="!editName.trim()">{{ i18n.t('skills.save') }}</button>
                <button class="btn-cancel" (click)="cancelEdit()">{{ i18n.t('skills.cancel') }}</button>
              </div>
            </ng-container>
          </div>
        </div>
      </ng-container>
    </div>
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

    .skills-page {
      max-width: 660px;
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

    /* Alerts */
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
    .alert button {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 0 4px;
    }
    .alert.error {
      background: #fff5f5;
      color: $error;
      border: 1px solid rgba($error, 0.2);
    }
    .alert.success {
      background: #f0fdf4;
      color: $success;
      border: 1px solid rgba($success, 0.2);
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Add row */
    .add-row {
      display: flex;
      gap: 10px;
      margin-bottom: 18px;
    }
    .add-row input {
      flex: 1;
      height: 46px;
      padding: 0 16px;
      border: 1.5px solid $gray-200;
      border-radius: 12px;
      font-size: 14px;
      outline: none;
      background: white;
      transition: all 0.25s;
    }
    .add-row input:focus {
      border-color: $logo-red-deep;
      box-shadow: 0 0 0 3px rgba($logo-red-deep, 0.08);
    }
    .btn-add {
      padding: 0 22px;
      height: 46px;
      background: linear-gradient(135deg, $logo-red-deep, $logo-red);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s;
      box-shadow: 0 4px 12px rgba($logo-red, 0.2);
    }
    .btn-add:hover:not(:disabled) {
      background: linear-gradient(135deg, $logo-red-mid, $logo-red-deep);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba($logo-red, 0.3);
    }
    .btn-add:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Search bar */
    .search-bar {
      margin-bottom: 22px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .search-count {
      font-size: 12.5px;
      color: $gray-400;
      white-space: nowrap;
      font-weight: 500;
    }

    /* Highlight match */
    :host ::ng-deep .highlight {
      background: rgba($logo-red, 0.1);
      color: $logo-red-deep;
      font-weight: 700;
      border-radius: 3px;
      padding: 0 2px;
    }

    .search-result-row { border-left: 3px solid $logo-red; }

    .center {
      text-align: center;
      color: $gray-400;
      font-size: 14px;
      padding: 24px 0;
    }

    /* List */
    .list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      background: white;
      border: 1px solid $gray-200;
      border-radius: 12px;
      transition: all 0.2s;
    }
    .row:hover {
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      border-color: rgba($logo-red, 0.1);
    }
    .name { font-size: 15px; color: $gray-800; font-weight: 500; }
    .edit-input {
      flex: 1;
      padding: 8px 12px;
      border: 1.5px solid $gray-200;
      border-radius: 8px;
      font-size: 14px;
      margin-right: 10px;
      outline: none;
    }
    .edit-input:focus { border-color: $logo-red-deep; }

    .actions { display: flex; gap: 6px; }
    .actions button {
      padding: 7px 14px;
      border: none;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-edit {
      background: rgba($logo-red, 0.08);
      color: $logo-red;
    }
    .btn-edit:hover { background: rgba($logo-red, 0.15); }
    .btn-delete {
      background: rgba($error, 0.08);
      color: $error;
    }
    .btn-delete:hover { background: rgba($error, 0.15); }
    .btn-save {
      background: rgba($success, 0.08);
      color: $success;
    }
    .btn-save:hover { background: rgba($success, 0.15); }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancel {
      background: $gray-100;
      color: $gray-600;
    }
    .btn-cancel:hover { background: $gray-200; }
  `]
})
export class SkillsComponent implements OnInit {
  skills: Skill[] = [];
  newName = '';
  editingId: string | null = null;
  editName = '';
  error = '';
  success = '';
  loading = false;

  // Search state
  searchQuery = '';
  searchResults: Skill[] = [];

  constructor(private skillService: SkillService, public i18n: I18nService) { }

  ngOnInit(): void {
    this.loadSkills();
  }

  onSearchResults(results: Skill[]): void {
    this.searchResults = results;
  }

  onQueryChange(q: string): void {
    this.searchQuery = q;
  }

  onSearchCleared(): void {
    this.searchQuery = '';
    this.searchResults = [];
  }

  onSkillSelected(skill: Skill): void {
    this.searchQuery = skill.name;
    this.searchResults = [skill];
  }

  highlight(text: string, query: string): string {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(
      new RegExp(`(${escaped})`, 'gi'),
      '<span class="highlight">$1</span>'
    );
  }

  loadSkills(): void {
    this.loading = true;
    this.skillService.getAll().subscribe({
      next: (skills) => { this.skills = skills; this.loading = false; },
      error: () => { this.error = this.i18n.t('skills.loadError'); this.loading = false; }
    });
  }

  addSkill(): void {
    const name = this.newName.trim();
    if (!name) return;
    this.clearMessages();
    this.skillService.create(name).subscribe({
      next: (skill) => {
        this.skills.push(skill);
        this.newName = '';
        this.success = `"${skill.name}" ${this.i18n.t('skills.added')}`;
        this.autoClear();
      },
      error: () => { this.error = this.i18n.t('skills.addError'); }
    });
  }

  startEdit(skill: Skill): void {
    this.editingId = skill.documentId;
    this.editName = skill.name;
    this.onSearchCleared();
    this.clearMessages();
  }

  cancelEdit(): void { this.editingId = null; this.editName = ''; }

  saveEdit(): void {
    if (!this.editingId) return;
    const name = this.editName.trim();
    if (!name) return;
    this.clearMessages();
    this.skillService.update(this.editingId, name).subscribe({
      next: (updated) => {
        const i = this.skills.findIndex(s => s.documentId === updated.documentId);
        if (i !== -1) this.skills[i] = updated;
        this.success = this.i18n.t('skills.updated');
        this.editingId = null;
        this.editName = '';
        this.autoClear();
      },
      error: () => { this.error = this.i18n.t('skills.updateError'); }
    });
  }

  remove(skill: Skill): void {
    if (!confirm(`${this.i18n.t('skills.deleteConfirm')} "${skill.name}" ?`)) return;
    this.clearMessages();
    this.skillService.delete(skill.documentId).subscribe({
      next: () => {
        this.skills = this.skills.filter(s => s.documentId !== skill.documentId);
        this.success = `"${skill.name}" ${this.i18n.t('skills.deleted')}`;
        this.autoClear();
      },
      error: () => { this.error = this.i18n.t('skills.deleteError'); }
    });
  }

  private clearMessages(): void { this.error = ''; this.success = ''; }
  private autoClear(): void { setTimeout(() => this.success = '', 3000); }
}
