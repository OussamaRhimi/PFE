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
    <div>
        <h4><strong>{{ i18n.t('skills.title') }}</strong></h4>
        <p class="muted">{{ i18n.t('skills.subtitle') }}</p>
    </div>
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

  <!-- Conteneur pour la recherche et l'ajout sur la même ligne -->
  <div class="search-add-row">
    <!-- Barre d'ajout (à gauche) -->
    <div class="add-row">
      <input
        type="text"
        [(ngModel)]="newName"
        [placeholder]="i18n.t('skills.placeholder')"
        (keyup.enter)="addSkill()"
      />
      <button class="btn-add" (click)="addSkill()" [disabled]="!newName.trim()">{{ i18n.t('skills.add') }}</button>
    </div>

    <!-- Barre de recherche (à droite) -->
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
/* Skills Page Styles - Modern Red & White Design with Cards */
.skills-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
}

/* Page Header */
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
   
  
}
.header div {
    flex: 1;
}


.header h4 {
    font-size: 1.6rem;
    font-weight: 600;
    color: #0e0c0c;
    margin: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    letter-spacing: -0.5px;
    margin-bottom: 0.5rem;
  
}

.back-link {
    color: #0a0505;
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    transition: all 0.3s ease;
    background: white;
    border: 1px solid #0a0101;
}

.back-link:hover {
    background: #170f0f;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 0, 0, 0.2);
}

/* Alert Messages */
.alert {
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.alert.error {
    background: #ffe4e4;
    color: #8B0000;
    border-left: 4px solid #8B0000;
    border-radius: 8px;
}

.alert.success {
    background: #e8f5e9;
    color: #2e7d32;
    border-left: 4px solid #2e7d32;
    border-radius: 8px;
    animation: slideIn 0.3s ease, glow 1s ease-in-out;
}

@keyframes glow {
    0%, 100% {
        box-shadow: 0 0 0 0 rgba(46, 125, 50, 0);
    }
    50% {
        box-shadow: 0 0 20px 5px rgba(46, 125, 50, 0.3);
    }
}

.alert button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    transition: opacity 0.2s;
}

.alert button:hover {
    opacity: 1;
}

/* Container for Search and Add in row */
.search-add-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
    align-items: center;
    flex-wrap: wrap;
}

/* Add Row - Left side */
.add-row {
    display: flex;
    gap: 1rem;
    background: white;
    padding: 1.5rem;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border: 1px solid #f0f0f0;
    flex: 2;
    min-width: 250px;
}

.add-row input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.3s ease;
    font-family: inherit;
}

.add-row input:focus {
    outline: none;
    border-color: #8B0000;
    box-shadow: 0 0 0 3px rgba(139, 0, 0, 0.1);
}

.btn-add {
    padding: 0.75rem 1.5rem;
    background: #8B0000;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
    font-size: 0.95rem;
    white-space: nowrap;
}

.btn-add:hover:not(:disabled) {
    background: #6d0000;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
}

.btn-add:disabled {
    background: #cccccc;
    cursor: not-allowed;
    opacity: 0.6;
}

/* Search Bar Container - Right side */
.search-bar {
    flex: 1;
    min-width: 280px;
    background: white;
    padding: 1.5rem;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border: 1px solid #f0f0f0;
}

/* Style for skill-autocomplete component */
::ng-deep .search-bar app-skill-autocomplete {
    display: block;
    width: 100%;
}

::ng-deep .search-bar input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.3s ease;
    font-family: inherit;
    background: white;
}

::ng-deep .search-bar input:focus {
    outline: none;
    border-color: #8B0000;
    box-shadow: 0 0 0 3px rgba(139, 0, 0, 0.1);
}

.search-count {
    display: inline-block;
    margin-top: 0.75rem;
    font-size: 0.875rem;
    color: #666;
    font-weight: 500;
    padding: 0.25rem 0.75rem;
    background: #f5f5f5;
    border-radius: 20px;
}

/* Center Text */
.center {
    text-align: center;
    padding: 3rem;
    color: #666;
    font-size: 1rem;
    background: white;
    border-radius: 12px;
    margin: 1rem 0;
}

/* Cards Grid Container */
.list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
    padding: 0.5rem 0;
}

/* Card Styles */
.row {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    transition: all 0.3s ease;
    border: 1px solid #f0f0f0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: relative;
    overflow: hidden;
}

/* Card Hover Effect */
.row:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(139, 0, 0, 0.1);
    border-color: rgba(139, 0, 0, 0.2);
}

/* Card Decorative Border */
.row::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #8B0000, #d42020, #8B0000);
    transform: scaleX(0);
    transition: transform 0.3s ease;
}

.row:hover::before {
    transform: scaleX(1);
}

/* Skill Name in Card */
.name {
    font-size: 1.2rem;
    font-weight: 600;
    color: #2c2c2c;
    padding: 0.5rem 0;
    border-bottom: 2px solid #f0f0f0;
    word-break: break-word;
    text-align: center;
}

/* Highlighted search text */
.name ::ng-deep mark {
    background: #ffeb3b;
    color: #2c2c2c;
    padding: 0 2px;
    border-radius: 3px;
    font-weight: 600;
}

/* Actions Container in Card - Below the name */
.actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 0.5rem;
}

/* Buttons Styles */
.btn-edit, .btn-delete, .btn-save, .btn-cancel {
    padding: 0.6rem 1.2rem;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
    font-family: inherit;
    flex: 1;
    text-align: center;
}

.btn-edit {
    background: #f0f0f0;
    color: #555;
}

.btn-edit:hover {
    background: #e0e0e0;
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-delete {
    background: #820303;
    color: #fefcfc;
}

.btn-delete:hover {
    background: #ffcccc;
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(139, 0, 0, 0.2);
}

.btn-save {
    background: #8B0000;
    color: white;
}

.btn-save:hover:not(:disabled) {
    background: #6d0000;
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(139, 0, 0, 0.3);
}

.btn-save:disabled {
    background: #cccccc;
    cursor: not-allowed;
}

.btn-cancel {
    background: #f0f0f0;
    color: #666;
}

.btn-cancel:hover {
    background: #e0e0e0;
    transform: translateY(-2px);
}

/* Edit Input in Card */
.edit-input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.2s ease;
    font-family: inherit;
    margin-bottom: 0.5rem;
    text-align: center;
}

.edit-input:focus {
    outline: none;
    border-color: #8B0000;
    box-shadow: 0 0 0 3px rgba(139, 0, 0, 0.1);
}

/* Loading State */
.loading {
    text-align: center;
    padding: 3rem;
    color: #8B0000;
    font-size: 1.1rem;
}

/* Responsive Design */
@media (max-width: 768px) {
    .skills-page {
        padding: 1rem;
    }
    
    .header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
    }
    
    .header h1 {
        font-size: 1.5rem;
    }
    
    .search-add-row {
        flex-direction: column;
    }
    
    .add-row {
        flex-direction: column;
        min-width: auto;
        padding: 1rem;
    }
    
    .search-bar {
        min-width: auto;
        padding: 1rem;
    }
    
    .list {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    
    .row {
        padding: 1.2rem;
    }
    
    .actions {
        flex-direction: column;
    }
    
    .btn-edit, .btn-delete, .btn-save, .btn-cancel {
        width: 100%;
    }
    
    .name {
        font-size: 1.1rem;
    }
}

/* Tablet Responsive */
@media (min-width: 769px) and (max-width: 1024px) {
    .list {
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }
    
    .add-row {
        flex: 1.5;
    }
    
    .search-bar {
        flex: 1;
    }
}

/* Desktop Large */
@media (min-width: 1200px) {
    .skills-page {
        max-width: 1400px;
    }
    
    .add-row {
        flex: 2;
    }
    
    .search-bar {
        flex: 1;
    }
}

/* Scrollbar Styling */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}

::-webkit-scrollbar-thumb {
    background: #8B0000;
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: #6d0000;
}

/* Smooth Transitions */
* {
    transition: all 0.2s ease-in-out;
}

/* Focus Visible for Accessibility */
:focus-visible {
    outline: 2px solid #8B0000;
    outline-offset: 2px;
}

/* Card Animation */
@keyframes cardAppear {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.row {
    animation: cardAppear 0.3s ease backwards;
}

/* Staggered Animation for Cards */
.row:nth-child(1) { animation-delay: 0.05s; }
.row:nth-child(2) { animation-delay: 0.1s; }
.row:nth-child(3) { animation-delay: 0.15s; }
.row:nth-child(4) { animation-delay: 0.2s; }
.row:nth-child(5) { animation-delay: 0.25s; }
.row:nth-child(6) { animation-delay: 0.3s; }

/* Search result specific styling */
.search-result-row {
    animation: cardAppear 0.3s ease backwards;
}

/* Print Styles */
@media print {
    .skills-page {
        background: white;
        padding: 0;
    }
    
    .btn-add, .btn-edit, .btn-delete, .btn-save, .btn-cancel, .back-link {
        display: none;
    }
    
    .list {
        display: block;
    }
    
    .row {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 1rem;
        box-shadow: none;
        border: 1px solid #ddd;
    }
    
    .row::before {
        display: none;
    }
}
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
