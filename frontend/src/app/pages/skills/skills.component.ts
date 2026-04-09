// skills.component.ts - Version premium glassmorphism
import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SkillService, Skill } from '../../services/skill.service';
import { SkillAutocompleteComponent } from '../../components/skill-autocomplete/skill-autocomplete.component';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SkillAutocompleteComponent, MatIconModule],
  template: `
    <div class="skills-dashboard" [class.dark-mode]="isDarkMode" [class.light-mode]="!isDarkMode">
      <!-- Animated Background -->
      <canvas id="bg-canvas"></canvas>
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
      <div class="noise-overlay"></div>
      
      <div class="content-wrapper">
        
        <!-- Theme Toggle -->
        <div class="theme-toggle-wrapper">
          <button class="theme-toggle" (click)="toggleTheme()">
            <mat-icon class="toggle-icon">{{ isDarkMode ? 'light_mode' : 'dark_mode' }}</mat-icon>
            <span class="toggle-text">{{ isDarkMode ? 'Light' : 'Dark' }} Mode</span>
          </button>
        </div>

        <!-- Header Section -->
        <header class="header-section">
          <div class="header-nav">
            <a routerLink="/dashboard" class="back-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              {{ i18n.t('skills.backToDashboard') }}
            </a>
          </div>
          <div class="title-block">
            <h1 class="page-title">{{ i18n.t('skills.title') }}<span class="dot-accent">.</span></h1>
            <div class="badge-total" *ngIf="!loading">
              <span class="badge-number">{{ skills.length }}</span>
              <span class="badge-label">{{ i18n.t('skills.results') }}</span>
            </div>
          </div>
          <p class="page-subtitle">Architecturez vos talents. Redéfinissez les limites de votre organisation avec une gestion de compétences pilotée par l'innovation.</p>
        </header>

        <!-- Alerts -->
        <div class="alerts-container">
          <div class="alert alert-error" *ngIf="error">
            <mat-icon class="alert-icon">error_outline</mat-icon>
            <span>{{ error }}</span>
            <button class="alert-close" (click)="error = ''">✕</button>
          </div>
          <div class="alert alert-success" *ngIf="success">
            <mat-icon class="alert-icon">check_circle_outline</mat-icon>
            <span>{{ success }}</span>
            <button class="alert-close" (click)="success = ''">✕</button>
          </div>
        </div>

        <!-- Control Center - Minimal Inline Bar -->
        <div class="control-bar floating-glass">
          <div class="control-group">
            <mat-icon class="control-icon accent-gold">auto_awesome</mat-icon>
            <div class="control-input-wrapper">
              <input 
                type="text" 
                [(ngModel)]="newName" 
                [placeholder]="i18n.t('skills.placeholder')" 
                (keyup.enter)="addSkill()"
                class="control-input"
              />
              <button class="control-btn" (click)="addSkill()" [disabled]="!newName.trim()">
                {{ i18n.t('skills.add') }}
              </button>
            </div>
          </div>

          <div class="divider-v"></div>

          <div class="control-group">
            <mat-icon class="control-icon">search</mat-icon>
            <div class="control-search-wrapper">
              <app-skill-autocomplete
                [initialValue]="searchQuery"
                (searchResults)="onSearchResults($event)"
                (searchCleared)="onSearchCleared()"
                (queryChange)="onQueryChange($event)"
                (skillSelected)="onSkillSelected($event)"
                [placeholder]="i18n.t('skills.searchPlaceholder')"
              ></app-skill-autocomplete>
            </div>
          </div>
        </div>

        <!-- Grid Container -->
        <div class="main-grid-container">
          
          <!-- Loading -->
          <div class="loading-overlay" *ngIf="loading && !searchQuery">
            <div class="loader"></div>
            <p>Initialisation du système...</p>
          </div>

          <!-- Search Results -->
          <ng-container *ngIf="searchQuery">
            <div class="empty-state" *ngIf="!loading && searchResults.length === 0">
              <div class="empty-icon"><mat-icon>search_off</mat-icon></div>
              <p>Aucune donnée trouvée pour "<strong>{{ searchQuery }}</strong>"</p>
            </div>

            <div class="skills-grid" *ngIf="!loading && searchResults.length > 0">
              <div class="skill-row floating-glass" *ngFor="let skill of searchResults; let i = index" 
                   [style.animation-delay]="(i * 0.05) + 's'">
                <div class="row-content" *ngIf="editingId !== skill.documentId">
                  <div class="row-left">
                    <mat-icon class="row-icon">layers</mat-icon>
                    <span class="row-title" [innerHTML]="highlight(skill.name, searchQuery)"></span>
                  </div>
                  <div class="row-actions">
                    <button class="action-btn edit" (click)="startEdit(skill)" title="Modifier">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button class="action-btn delete" (click)="remove(skill)" title="Supprimer">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                </div>
                <div class="row-edit" *ngIf="editingId === skill.documentId">
                  <input type="text" [(ngModel)]="editName" (keyup.enter)="saveEdit()" class="edit-input" autofocus />
                  <div class="edit-buttons">
                    <button class="save-btn" (click)="saveEdit()"><mat-icon>check</mat-icon></button>
                    <button class="cancel-btn" (click)="cancelEdit()"><mat-icon>close</mat-icon></button>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>

          <!-- All Skills -->
          <ng-container *ngIf="!searchQuery">
            <div class="empty-state" *ngIf="!loading && skills.length === 0">
              <div class="empty-icon"><mat-icon>inventory_2</mat-icon></div>
              <p>Le référentiel est actuellement vide.</p>
              <button class="btn-primary small" (click)="addDemoSkills()">Ajouter des compétences démo</button>
            </div>

            <div class="skills-grid" *ngIf="!loading && skills.length > 0">
              <div class="skill-row floating-glass" *ngFor="let skill of skills; let i = index" 
                   [style.animation-delay]="(i * 0.02) + 's'">
                <div class="row-content" *ngIf="editingId !== skill.documentId">
                  <div class="row-left">
                    <mat-icon class="row-icon">layers</mat-icon>
                    <span class="row-title">{{ skill.name }}</span>
                  </div>
                  <div class="row-actions">
                    <button class="action-btn edit" (click)="startEdit(skill)" title="Modifier">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button class="action-btn delete" (click)="remove(skill)" title="Supprimer">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                </div>
                <div class="row-edit" *ngIf="editingId === skill.documentId">
                  <input type="text" [(ngModel)]="editName" (keyup.enter)="saveEdit()" class="edit-input" autofocus />
                  <div class="edit-buttons">
                    <button class="save-btn" (click)="saveEdit()"><mat-icon>check</mat-icon></button>
                    <button class="cancel-btn" (click)="cancelEdit()"><mat-icon>close</mat-icon></button>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>

        </div>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap');

    :host {
      --bordeaux: #8b1f1f;
      --bordeaux-light: #a82828;
      --bordeaux-dark: #5e1111;
      --bordeaux-glow: rgba(139, 31, 31, 0.25);
      --transition-smooth: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }

    /* Dark Mode Variables */
    .dark-mode {
      --bg-primary: #0a0c10;
      --bg-secondary: #14161c;
      --text-primary: #ffffff;
      --text-secondary: rgba(255, 255, 255, 0.7);
      --text-muted: rgba(255, 255, 255, 0.5);
      --card-bg: rgba(20, 22, 28, 0.6);
      --card-border: rgba(139, 31, 31, 0.15);
      --input-bg: rgba(255, 255, 255, 0.05);
      --input-border: rgba(255, 255, 255, 0.1);
      --shadow-sm: 0 8px 20px rgba(0, 0, 0, 0.3);
      --shadow-lg: 0 15px 35px rgba(0, 0, 0, 0.4);
    }

    /* Light Mode Variables */
    .light-mode {
      --bg-primary: #f0f2f5;
      --bg-secondary: #ffffff;
      --text-primary: #1a1e2c;
      --text-secondary: rgba(0, 0, 0, 0.7);
      --text-muted: rgba(0, 0, 0, 0.5);
      --card-bg: rgba(255, 255, 255, 0.55);
      --card-border: rgba(139, 31, 31, 0.2);
      --input-bg: rgba(255, 255, 255, 0.9);
      --input-border: rgba(0, 0, 0, 0.1);
      --shadow-sm: 0 8px 20px rgba(0, 0, 0, 0.08);
      --shadow-lg: 0 15px 35px rgba(0, 0, 0, 0.12);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .skills-dashboard {
      position: relative;
      min-height: 100vh;
      overflow-x: hidden;
      padding: 30px 24px 60px;
      background: var(--bg-primary);
      font-family: 'Inter', sans-serif;
      color: var(--text-primary);
      transition: var(--transition-smooth);
    }

    /* Animated Background Canvas */
    #bg-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
    }

    /* Gradient Orbs */
    .gradient-orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(100px);
      z-index: 0;
      opacity: 0.35;
      pointer-events: none;
      transition: var(--transition-smooth);
    }
    .orb-1 {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, var(--bordeaux), transparent);
      top: -200px;
      left: -100px;
      animation: floatOrb 20s ease-in-out infinite;
    }
    .orb-2 {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, var(--bordeaux-light), transparent);
      bottom: 10%;
      right: -100px;
      animation: floatOrb 15s ease-in-out infinite reverse;
    }
    .orb-3 {
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, var(--bordeaux-dark), transparent);
      top: 40%;
      left: 50%;
      animation: floatOrb 25s linear infinite;
    }
    @keyframes floatOrb {
      0% { transform: translate(0, 0) rotate(0deg); }
      50% { transform: translate(50px, 100px) rotate(180deg); }
      100% { transform: translate(0, 0) rotate(360deg); }
    }

    .noise-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-radial-gradient(circle at 20% 30%, rgba(0,0,0,0.02), rgba(0,0,0,0.02) 2px, transparent 2px, transparent 4px);
      pointer-events: none;
      z-index: 0;
    }

    .content-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      position: relative;
      z-index: 2;
    }

    /* Theme Toggle */
    .theme-toggle-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .theme-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 40px;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      backdrop-filter: blur(10px);
      transition: var(--transition-smooth);
    }
    .theme-toggle:hover {
      border-color: var(--bordeaux);
      transform: translateY(-2px);
    }

    /* Header */
    .header-section {
      margin-bottom: 20px;
      margin-top: 4px;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      padding: 8px 16px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 40px;
      transition: var(--transition-smooth);
      margin-bottom: 24px;
      backdrop-filter: blur(10px);
    }
    .back-link:hover {
      color: var(--bordeaux);
      border-color: var(--bordeaux);
      transform: translateX(-5px);
    }
    .title-block {
      display: flex;
      align-items: baseline;
      gap: 20px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .page-title {
      font-family: 'Outfit', sans-serif;
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 700;
      margin: 0;
      line-height: 1.1;
      letter-spacing: -1px;
    }
    .dot-accent {
      color: var(--bordeaux);
    }
    .badge-total {
      background: rgba(139, 31, 31, 0.15);
      color: var(--bordeaux);
      padding: 4px 12px;
      border-radius: 40px;
      font-size: 11px;
      font-weight: 700;
      border: 1px solid rgba(139, 31, 31, 0.3);
    }
    .badge-number {
      font-size: 1rem;
      font-weight: 800;
    }
    .page-subtitle {
      max-width: 600px;
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.6;
    }

    /* Floating Glass Effect */
    .floating-glass {
      background: var(--card-bg);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid var(--card-border);
      box-shadow: var(--shadow-sm);
      position: relative;
    }
    .floating-glass::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
      pointer-events: none;
      border-radius: inherit;
    }

    /* Control Bar - Minimal Inline layout */
    .control-bar {
      display: flex;
      align-items: center;
      padding: 12px 24px;
      gap: 32px;
      margin-bottom: 40px;
      border-radius: 20px;
      flex-wrap: wrap;
    }
    .control-group {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      min-width: 260px;
    }
    .control-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      color: var(--text-muted);
    }
    .accent-gold {
      color: #d4a843 !important;
      filter: drop-shadow(0 0 4px rgba(212, 168, 67, 0.35));
    }
    .control-input-wrapper {
      display: flex;
      align-items: center;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 12px;
      padding: 4px;
      flex: 1;
      transition: var(--transition-smooth);
    }
    .control-input-wrapper:focus-within {
      border-color: var(--bordeaux);
      box-shadow: 0 0 0 3px var(--bordeaux-glow);
    }
    .control-input {
      flex: 1;
      height: 38px;
      background: transparent;
      border: none;
      padding: 0 16px;
      color: var(--text-primary);
      font-size: 14px;
      outline: none;
    }
    .control-input::placeholder {
      color: var(--text-muted);
    }
    .control-btn {
      height: 38px;
      padding: 0 20px;
      background: #c39a9a; /* Softer bordeaux tone from mockup */
      border: none;
      border-radius: 10px;
      color: white;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: var(--transition-smooth);
    }
    .control-btn:hover:not(:disabled) {
      background: var(--bordeaux);
      transform: translateY(-1px);
    }
    .control-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .control-search-wrapper {
      flex: 1;
    }

    .divider-v {
      width: 1px;
      height: 30px;
      background: var(--card-border);
    }

    /* Autocomplete Styling Override */
    :host ::ng-deep app-skill-autocomplete {
      width: 100%;
    }
    :host ::ng-deep app-skill-autocomplete .autocomplete-container input {
      height: 46px !important;
      background: var(--input-bg) !important;
      border: 1px solid var(--input-border) !important;
      border-radius: 12px !important;
      color: var(--text-primary) !important;
      font-size: 14px !important;
      padding: 0 16px !important;
    }
    :host ::ng-deep app-skill-autocomplete .autocomplete-container input::placeholder {
      color: var(--text-muted) !important;
    }
    :host ::ng-deep app-skill-autocomplete .autocomplete-container input:focus {
      border-color: var(--bordeaux) !important;
      box-shadow: 0 0 0 3px var(--bordeaux-glow) !important;
    }
    :host ::ng-deep app-skill-autocomplete .results-list {
      background: var(--card-bg) !important;
      backdrop-filter: blur(20px) !important;
      border: 1px solid var(--card-border) !important;
      border-radius: 12px !important;
      margin-top: 6px !important;
    }
    :host ::ng-deep app-skill-autocomplete .results-list li {
      color: var(--text-primary) !important;
      padding: 10px 18px !important;
      font-size: 13px !important;
    }
    :host ::ng-deep app-skill-autocomplete .results-list li:hover {
      background: var(--bordeaux-glow) !important;
    }

    /* Skills Grid - Simple Rows */
    .skills-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    /* Row Styles */
    .skill-row {
      border-radius: 16px;
      padding: 14px 18px;
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      animation: cardEntrance 0.4s both;
    }

    .skill-row:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
      border-color: rgba(212, 168, 67, 0.3);
    }

    .row-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .row-left {
      display: flex;
      align-items: center;
      gap: 12px;
      overflow: hidden;
    }

    .row-icon {
      color: var(--text-muted);
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      flex-shrink: 0;
    }

    .row-title {
      font-family: 'Outfit', sans-serif;
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Actions */
    .row-actions {
      display: flex;
      gap: 8px;
      opacity: 0;
      transform: translateX(10px);
      transition: var(--transition-smooth);
    }

    .skill-row:hover .row-actions {
      opacity: 1;
      transform: translateX(0);
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition-smooth);
    }

    .action-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .action-btn:hover {
      background: rgba(139, 31, 31, 0.1);
      color: var(--bordeaux);
    }

    .action-btn.delete:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    /* Edit Mode */
    .row-edit {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
    }

    .edit-input {
      flex: 1;
      background: var(--input-bg);
      border: 1px solid var(--bordeaux);
      border-radius: 8px;
      padding: 8px 12px;
      color: var(--text-primary);
      font-weight: 500;
      outline: none;
      font-size: 14px;
    }

    .edit-input:focus {
      box-shadow: 0 0 0 2px var(--bordeaux-glow);
    }

    .edit-buttons {
      display: flex;
      gap: 6px;
    }

    .save-btn, .cancel-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      transition: var(--transition-smooth);
      border: none;
    }

    .save-btn {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }
    .save-btn:hover {
      background: #22c55e;
      color: white;
    }
    .save-btn mat-icon, .cancel-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .cancel-btn {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }
    .cancel-btn:hover {
      background: #ef4444;
      color: white;
    }

    /* Alerts */
    .alerts-container {
      margin-bottom: 20px;
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      border-radius: 14px;
      margin-bottom: 10px;
      background: var(--card-bg);
      backdrop-filter: blur(10px);
      border: 1px solid var(--card-border);
      animation: slideIn 0.3s ease;
      font-size: 13px;
      font-weight: 500;
    }

    .alert-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .alert-error {
      border-left: 4px solid #ef4444;
      color: #ef4444;
    }

    .alert-success {
      border-left: 4px solid #22c55e;
      color: #22c55e;
    }

    .alert-close {
      margin-left: auto;
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 1.1rem;
      opacity: 0.6;
      transition: 0.2s;
    }
    .alert-close:hover { opacity: 1; }

    /* Loading */
    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      gap: 14px;
    }

    .loader {
      width: 36px;
      height: 36px;
      border: 3px solid var(--card-border);
      border-top-color: var(--bordeaux);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px dashed var(--card-border);
      border-radius: 20px;
    }

    .empty-icon {
      margin-bottom: 16px;
      opacity: 0.5;
    }
    .empty-icon mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--text-muted);
    }
    .empty-state p {
      font-size: 15px;
      color: var(--text-muted);
    }

    /* Highlight */
    :host ::ng-deep .highlight {
      background: var(--bordeaux);
      color: white;
      padding: 2px 5px;
      border-radius: 5px;
    }

    /* Card Entrance Animation */
    @keyframes cardEntrance {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Toggle icon mat-icon sizing */
    .toggle-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
    }

    /* Responsive */
    @media (max-width: 900px) {
      .control-center {
        flex-direction: column;
        padding: 20px;
        gap: 20px;
      }
      .divider-v { display: none; }
      .add-box, .search-box { min-width: auto; }
    }
    @media (max-width: 768px) {
      .skills-dashboard {
        padding: 20px 16px;
      }
      .skills-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 14px;
      }
      .skill-card {
        padding: 14px 12px 12px;
      }
      .skill-title {
        font-size: 0.9rem;
      }
      .page-title { font-size: 2rem; }
    }
  `]
})
export class SkillsComponent implements OnInit, AfterViewInit, OnDestroy {
  skills: Skill[] = [];
  newName = '';
  editingId: string | null = null;
  editName = '';
  error = '';
  success = '';
  loading = false;
  searchQuery = '';
  searchResults: Skill[] = [];
  isDarkMode = true;

  private animationFrame: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(private skillService: SkillService, public i18n: I18nService) { }

  ngOnInit(): void {
    this.loadSkills();
    this.loadThemePreference();
  }

  ngAfterViewInit(): void {
    this.initAnimatedBackground();
  }

  ngOnDestroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  loadThemePreference(): void {
    const saved = localStorage.getItem('themeMode');
    if (saved) {
      this.isDarkMode = saved === 'dark';
    }
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('themeMode', this.isDarkMode ? 'dark' : 'light');
  }

  initAnimatedBackground(): void {
    this.canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

    this.resizeCanvas();
    this.drawCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas(): void {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  drawCanvas(): void {
    if (!this.canvas || !this.ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.clearRect(0, 0, w, h);

    // Draw floating particles
    const particleCount = 60;
    const time = Date.now() / 1000;

    for (let i = 0; i < particleCount; i++) {
      const x = (i * 157) % w;
      const y = (Math.sin(i * 0.15 + time) * 80 + (i * 83) % h) % h;
      const radius = 1 + (i % 2);
      const alpha = 0.25 + Math.sin(i + time) * 0.15;

      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(139, 31, 31, ${alpha})`;
      this.ctx.fill();
    }

    this.animationFrame = requestAnimationFrame(() => this.drawCanvas());
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
        this.success = `"${skill.name}" ajoutée!`;
        this.autoClear();
      },
      error: () => { this.error = this.i18n.t('skills.addError'); }
    });
  }

  addDemoSkills(): void {
    const demoSKills = ['Angular', 'React', 'Node.js', 'Python', 'TypeScript', 'UI/UX', 'Figma', 'PHP', 'Laravel', 'Strapi'];
    demoSKills.forEach(skill => {
      if (!this.skills.find(s => s.name === skill)) {
        this.skillService.create(skill).subscribe({
          next: (newSkill) => this.skills.push(newSkill)
        });
      }
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
        this.success = 'Compétence mise à jour!';
        this.editingId = null;
        this.editName = '';
        this.autoClear();
      },
      error: () => { this.error = this.i18n.t('skills.updateError'); }
    });
  }

  remove(skill: Skill): void {
    if (!confirm(`Supprimer "${skill.name}" ?`)) return;
    this.clearMessages();
    this.skillService.delete(skill.documentId).subscribe({
      next: () => {
        this.skills = this.skills.filter(s => s.documentId !== skill.documentId);
        this.success = `"${skill.name}" supprimée!`;
        this.autoClear();
      },
      error: () => { this.error = this.i18n.t('skills.deleteError'); }
    });
  }

  private clearMessages(): void { this.error = ''; this.success = ''; }
  private autoClear(): void { setTimeout(() => this.success = '', 3000); }
}