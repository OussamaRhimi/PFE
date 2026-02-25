import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { SkillService, Skill } from '../../services/skill.service';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="skills-page">
      <div class="header">
        <h1>Skills Management</h1>
        <a routerLink="/dashboard" class="back-link">&larr; Back to Dashboard</a>
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
          placeholder="Enter skill name"
          (keyup.enter)="addSkill()"
        />
        <button class="btn-add" (click)="addSkill()" [disabled]="!newName.trim()">Add</button>
      </div>

      <!-- Search bar -->
      <div class="search-bar">
        <div class="search-input-wrapper">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search skills..."
            class="search-input"
          />
          <button class="clear-btn" *ngIf="searchQuery" (click)="clearSearch()">
            &times;
          </button>
        </div>
        <span class="search-hint" *ngIf="isSearching">Searching…</span>
        <span class="search-count" *ngIf="searchQuery && !isSearching">
          {{ searchResults.length }} result{{ searchResults.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Loading (initial) -->
      <p class="center" *ngIf="loading && !searchQuery">Loading...</p>

      <!-- ── SEARCH RESULTS ── -->
      <ng-container *ngIf="searchQuery">
        <p class="center" *ngIf="isSearching">Searching…</p>
        <p class="center" *ngIf="!isSearching && searchResults.length === 0">
          No skills found for "<strong>{{ searchQuery }}</strong>".
        </p>
        <div class="list" *ngIf="!isSearching && searchResults.length > 0">
          <div class="row search-result-row" *ngFor="let skill of searchResults">
            <span class="name" [innerHTML]="highlight(skill.name, searchQuery)"></span>
            <div class="actions">
              <button class="btn-edit" (click)="startEdit(skill)">Edit</button>
              <button class="btn-delete" (click)="remove(skill)">Delete</button>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ── ALL SKILLS LIST ── -->
      <ng-container *ngIf="!searchQuery">
        <p class="center" *ngIf="!loading && skills.length === 0">No skills yet. Add one above.</p>
        <div class="list" *ngIf="!loading && skills.length > 0">
          <div class="row" *ngFor="let skill of skills">
            <!-- View mode -->
            <ng-container *ngIf="editingId !== skill.documentId">
              <span class="name">{{ skill.name }}</span>
              <div class="actions">
                <button class="btn-edit" (click)="startEdit(skill)">Edit</button>
                <button class="btn-delete" (click)="remove(skill)">Delete</button>
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
                <button class="btn-save" (click)="saveEdit()" [disabled]="!editName.trim()">Save</button>
                <button class="btn-cancel" (click)="cancelEdit()">Cancel</button>
              </div>
            </ng-container>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .skills-page {
      max-width: 620px;
      margin: 40px auto;
      padding: 0 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .header h1 { margin: 0; font-size: 24px; color: #333; }
    .back-link { text-decoration: none; color: #667eea; font-size: 14px; }
    .back-link:hover { text-decoration: underline; }

    /* Alerts */
    .alert {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; border-radius: 6px;
      margin-bottom: 16px; font-size: 14px;
    }
    .alert button { background: none; border: none; font-size: 18px; cursor: pointer; padding: 0 4px; }
    .alert.error  { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
    .alert.success{ background: #dcfce7; color: #16a34a; border: 1px solid #86efac; }

    /* Add row */
    .add-row { display: flex; gap: 8px; margin-bottom: 16px; }
    .add-row input {
      flex: 1; padding: 10px 12px;
      border: 1px solid #d1d5db; border-radius: 6px;
      font-size: 14px; outline: none;
    }
    .add-row input:focus { border-color: #667eea; box-shadow: 0 0 0 2px rgba(102,126,234,0.15); }
    .btn-add {
      padding: 10px 20px; background: #667eea; color: #fff;
      border: none; border-radius: 6px; font-size: 14px; cursor: pointer;
    }
    .btn-add:hover:not(:disabled) { background: #5568d3; }
    .btn-add:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ── Search bar ── */
    .search-bar {
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .search-input-wrapper {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      color: #9ca3af;
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      padding: 10px 36px 10px 38px;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      background: #f9fafb;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .search-input:focus {
      border-color: #e6331a;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(230, 51, 26, 0.10);
    }
    .clear-btn {
      position: absolute; right: 10px;
      background: none; border: none;
      font-size: 18px; color: #9ca3af;
      cursor: pointer; line-height: 1;
      padding: 0 2px;
    }
    .clear-btn:hover { color: #e6331a; }
    .search-hint { font-size: 13px; color: #9ca3af; white-space: nowrap; }
    .search-count { font-size: 13px; color: #6b7280; white-space: nowrap; }

    /* Highlight match */
    :host ::ng-deep .highlight {
      background: rgba(230, 51, 26, 0.12);
      color: #c0391b;
      font-weight: 700;
      border-radius: 2px;
      padding: 0 1px;
    }

    /* Search result row */
    .search-result-row { border-left: 3px solid #e6331a; }

    .center { text-align: center; color: #888; font-size: 14px; padding: 20px 0; }

    /* List */
    .list { display: flex; flex-direction: column; gap: 8px; }
    .row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      transition: box-shadow 0.15s;
    }
    .row:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
    .name { font-size: 15px; color: #333; }
    .edit-input {
      flex: 1; padding: 6px 10px;
      border: 1px solid #d1d5db; border-radius: 4px;
      font-size: 14px; margin-right: 8px; outline: none;
    }
    .edit-input:focus { border-color: #667eea; }
    .actions { display: flex; gap: 6px; }
    .actions button {
      padding: 6px 12px; border: none;
      border-radius: 4px; font-size: 13px; cursor: pointer;
    }
    .btn-edit   { background: #e0e7ff; color: #667eea; }
    .btn-edit:hover  { background: #c7d2fe; }
    .btn-delete { background: #fee2e2; color: #dc2626; }
    .btn-delete:hover{ background: #fca5a5; }
    .btn-save   { background: #dcfce7; color: #16a34a; }
    .btn-save:hover  { background: #86efac; }
    .btn-save:disabled{ opacity: 0.5; cursor: not-allowed; }
    .btn-cancel { background: #f3f4f6; color: #666; }
    .btn-cancel:hover{ background: #e5e7eb; }
  `]
})
export class SkillsComponent implements OnInit, OnDestroy {
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
  isSearching = false;

  private searchSubject = new Subject<string>();
  private subs = new Subscription();

  constructor(private skillService: SkillService) { }

  ngOnInit(): void {
    this.loadSkills();

    // Wire up debounced search
    const searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(q => q.trim().length > 0),
      switchMap(q => {
        this.isSearching = true;
        return this.skillService.search(q, 20);
      })
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.isSearching = false;
      },
      error: () => {
        this.error = 'Search failed. Please try again.';
        this.isSearching = false;
      }
    });

    this.subs.add(searchSub);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onSearchChange(q: string): void {
    if (!q.trim()) {
      this.searchResults = [];
      this.isSearching = false;
      return;
    }
    this.searchSubject.next(q);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.isSearching = false;
  }

  /** Wraps the matched portion with a <span class="highlight"> */
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
      error: () => { this.error = 'Failed to load skills.'; this.loading = false; }
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
        this.success = `"${skill.name}" added.`;
        this.autoClear();
      },
      error: () => { this.error = 'Failed to add skill. It may already exist.'; }
    });
  }

  startEdit(skill: Skill): void {
    this.editingId = skill.documentId;
    this.editName = skill.name;
    this.clearSearch();
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
        this.success = `Skill updated to "${updated.name}".`;
        this.editingId = null;
        this.editName = '';
        this.autoClear();
      },
      error: () => { this.error = 'Failed to update skill.'; }
    });
  }

  remove(skill: Skill): void {
    if (!confirm(`Delete "${skill.name}"?`)) return;
    this.clearMessages();
    this.skillService.delete(skill.documentId).subscribe({
      next: () => {
        this.skills = this.skills.filter(s => s.documentId !== skill.documentId);
        this.success = `"${skill.name}" deleted.`;
        this.autoClear();
      },
      error: () => { this.error = 'Failed to delete skill.'; }
    });
  }

  private clearMessages(): void { this.error = ''; this.success = ''; }
  private autoClear(): void { setTimeout(() => this.success = '', 3000); }
}
