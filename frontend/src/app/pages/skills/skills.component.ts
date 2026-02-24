import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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

      <!-- Loading -->
      <p class="center" *ngIf="loading">Loading...</p>

      <!-- Empty -->
      <p class="center" *ngIf="!loading && skills.length === 0">No skills yet. Add one above.</p>

      <!-- List -->
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
    </div>
  `,
  styles: [`
    .skills-page {
      max-width: 600px;
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

    .header h1 {
      margin: 0;
      font-size: 24px;
      color: #333;
    }

    .back-link {
      text-decoration: none;
      color: #667eea;
      font-size: 14px;
    }
    .back-link:hover { text-decoration: underline; }

    /* Alerts */
    .alert {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .alert button {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 0 4px;
    }
    .alert.error {
      background: #fee2e2;
      color: #dc2626;
      border: 1px solid #fca5a5;
    }
    .alert.success {
      background: #dcfce7;
      color: #16a34a;
      border: 1px solid #86efac;
    }

    /* Add row */
    .add-row {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
    }
    .add-row input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
    }
    .add-row input:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.15);
    }
    .btn-add {
      padding: 10px 20px;
      background: #667eea;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    }
    .btn-add:hover:not(:disabled) { background: #5568d3; }
    .btn-add:disabled { opacity: 0.5; cursor: not-allowed; }

    .center {
      text-align: center;
      color: #888;
      font-size: 14px;
      padding: 20px 0;
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
      padding: 12px 16px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .name {
      font-size: 15px;
      color: #333;
    }
    .edit-input {
      flex: 1;
      padding: 6px 10px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 14px;
      margin-right: 8px;
      outline: none;
    }
    .edit-input:focus {
      border-color: #667eea;
    }

    .actions {
      display: flex;
      gap: 6px;
    }
    .actions button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-edit  { background: #e0e7ff; color: #667eea; }
    .btn-edit:hover { background: #c7d2fe; }
    .btn-delete { background: #fee2e2; color: #dc2626; }
    .btn-delete:hover { background: #fca5a5; }
    .btn-save  { background: #dcfce7; color: #16a34a; }
    .btn-save:hover { background: #86efac; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancel { background: #f3f4f6; color: #666; }
    .btn-cancel:hover { background: #e5e7eb; }
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

  constructor(private skillService: SkillService) {}

  ngOnInit(): void {
    this.loadSkills();
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
    this.clearMessages();
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editName = '';
  }

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
