import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  CandidateService,
  CandidateDetail,
  CvTemplateMeta,
  CvTemplateKey,
  CvPreviewResponse
} from '../../services/candidate.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-candidate-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page">
      <!-- Back navigation -->
      <a routerLink="/candidates" class="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        All Candidates
      </a>

      <!-- Loading skeleton -->
      <div class="skeleton-page" *ngIf="loading">
        <div class="sk sk-title"></div>
        <div class="sk sk-sub"></div>
        <div class="sk-grid">
          <div class="sk sk-card"></div>
          <div class="sk sk-card"></div>
          <div class="sk sk-card"></div>
          <div class="sk sk-card"></div>
        </div>
      </div>

      <!-- Error -->
      <div class="alert error" *ngIf="error && !loading">
        {{ error }}
      </div>

      <!-- Main content -->
      <ng-container *ngIf="candidate && !loading">
        <!-- Hero header -->
        <div class="hero">
          <div class="avatar-big">{{ candidate.fullName.charAt(0).toUpperCase() }}</div>
          <div class="hero-info">
            <h1 class="candidate-name">{{ candidate.fullName }}</h1>
            <div class="hero-meta">
              <a [href]="'mailto:' + candidate.email" class="meta-chip email-chip">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
                {{ candidate.email }}
              </a>
              <span class="meta-chip" *ngIf="candidate.jobTitle">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                {{ candidate.jobTitle }}
              </span>
              <span class="meta-chip" *ngIf="candidate.selfReportedYearsExperience != null">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ candidate.selfReportedYearsExperience }} yr{{ candidate.selfReportedYearsExperience !== 1 ? 's' : '' }} exp.
              </span>
            </div>
          </div>
          <div class="hero-actions">
            <span class="status-badge" [ngClass]="'badge-' + candidate.status">{{ candidate.status }}</span>
          </div>
        </div>

        <!-- Cards grid -->
        <div class="cards">

          <!-- Score card -->
          <div class="card card-score">
            <div class="card-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              AI Score
            </div>
            <div class="score-display">
              <svg class="score-ring" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f3f7" stroke-width="8"/>
                <circle cx="40" cy="40" r="34" fill="none" stroke="url(#scoreGrad)" stroke-width="8"
                  [attr.stroke-dasharray]="(candidate.score / 100) * 213.6 + ' 213.6'"
                  stroke-linecap="round"
                  transform="rotate(-90 40 40)"/>
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#791212"/>
                    <stop offset="100%" style="stop-color:#8b1f1f"/>
                  </linearGradient>
                </defs>
              </svg>
              <span class="score-num">{{ candidate.score | number:'1.0-0' }}</span>
            </div>
            <div class="score-label">out of 100</div>
          </div>

          <!-- Status card -->
          <div class="card">
            <div class="card-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Application Status
            </div>
            <div class="stat-value">
              <ng-container *ngIf="!editingStatus">
                <span class="status-badge large-badge" [ngClass]="'badge-' + candidate.status">{{ candidate.status }}</span>
                <button class="btn-edit" (click)="startEditStatus()" title="Edit status">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </ng-container>
              <ng-container *ngIf="editingStatus">
                <select [(ngModel)]="candidate.status" class="status-select" [disabled]="statusSaving">
                  <option *ngFor="let status of statusOptions" [value]="status">{{ status }}</option>
                </select>
                <button class="btn-save" (click)="saveStatus(candidate.status)" [disabled]="statusSaving">
                  {{ statusSaving ? 'Saving...' : 'Save' }}
                </button>
                <button class="btn-cancel" (click)="cancelEdit()" [disabled]="statusSaving">Cancel</button>
              </ng-container>
            </div>
            <div class="card-sub">Applied {{ candidate.createdAt | date:'dd MMM yyyy' }}</div>
            <div class="card-sub" *ngIf="candidate.updatedAt !== candidate.createdAt">
              Updated {{ candidate.updatedAt | date:'dd MMM yyyy' }}
            </div>
          </div>

          <!-- GDPR card -->
          <div class="card card-gdpr">
            <div class="card-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              GDPR / Consent
            </div>
            <div class="gdpr-row">
              <span class="gdpr-key">Consent given</span>
              <span class="gdpr-val" [class.yes]="candidate.consent" [class.no]="!candidate.consent">
                {{ candidate.consent ? '✓ Yes' : '✗ No' }}
              </span>
            </div>
            <div class="gdpr-row" *ngIf="candidate.consentAt">
              <span class="gdpr-key">Consent date</span>
              <span class="gdpr-val">{{ candidate.consentAt | date:'dd MMM yyyy, HH:mm' }}</span>
            </div>
            <div class="gdpr-row" *ngIf="candidate.retentionUntil">
              <span class="gdpr-key">Retain until</span>
              <span class="gdpr-val">{{ candidate.retentionUntil | date:'dd MMM yyyy' }}</span>
            </div>
          </div>

          <!-- Links card -->
          <div class="card" *ngIf="candidate.linkedin || candidate.portfolio">
            <div class="card-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              Links
            </div>
            <div class="links">
              <a *ngIf="candidate.linkedin" [href]="candidate.linkedin" target="_blank" rel="noopener" class="external-link linkedin-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                LinkedIn Profile
              </a>
              <a *ngIf="candidate.portfolio" [href]="candidate.portfolio" target="_blank" rel="noopener" class="external-link portfolio-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                Portfolio / Website
              </a>
            </div>
          </div>
        </div>

        <!-- Notes row -->
        <div class="notes-row">
          <div class="note-card" *ngIf="candidate.candidateNotes">
            <div class="note-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Candidate's Note
            </div>
            <p class="note-text">{{ candidate.candidateNotes }}</p>
          </div>

          <div class="note-card note-card-hr" *ngIf="candidate.hrNotes && !editingNotes">
            <div class="note-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              HR Notes
              <button class="btn-edit-notes" (click)="startEditNotes()" title="Edit notes">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
            <p class="note-text">{{ candidate.hrNotes }}</p>
          </div>

          <div class="note-card note-card-hr" *ngIf="editingNotes">
            <div class="note-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              HR Notes (Editing)
            </div>
            <textarea [(ngModel)]="notesDraft" class="notes-textarea" [disabled]="notesSaving" placeholder="Add or update HR notes..."></textarea>
            <div class="notes-actions">
              <button class="btn-save" (click)="saveNotes()" [disabled]="notesSaving">
                {{ notesSaving ? 'Saving...' : 'Save Notes' }}
              </button>
              <button class="btn-cancel" (click)="cancelEdit()" [disabled]="notesSaving">Cancel</button>
            </div>
          </div>

          <div class="note-card note-placeholder" *ngIf="!candidate.hrNotes && !editingNotes">
            <div class="note-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              HR Notes
              <button class="btn-edit-notes" (click)="startEditNotes()" title="Add notes">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
            <p class="note-text placeholder">No HR notes yet. Click the + button to add one.</p>
          </div>
        </div>

        <!-- Resume section -->
        <div class="resume-section">
          <div class="resume-header">
            <div class="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Resume
            </div>
          </div>

          <div class="resume-card" *ngIf="candidate.resume; else noResume">
            <div class="resume-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div class="resume-info">
              <div class="resume-name">{{ candidate.resume.name }}</div>
              <div class="resume-meta">
                <span class="mime-badge">{{ getFileTypeLabel(candidate.resume.mime) }}</span>
                <span>{{ formatSize(candidate.resume.size) }}</span>
              </div>
            </div>
            <a [href]="downloadUrl" target="_blank" rel="noopener" class="btn-download">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Resume
            </a>
          </div>

          <ng-template #noResume>
            <div class="no-resume">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd0dc" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>No resume attached</span>
            </div>
          </ng-template>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════ -->
        <!-- SPRINT 3: AI Processing Actions -->
        <!-- ══════════════════════════════════════════════════════════════════ -->
        <div class="ai-actions-section">
          <div class="section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><path d="M7.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/><path d="M16.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>
            AI Processing
          </div>

          <div class="ai-actions-row">
            <!-- Status indicator with spinner for processing -->
            <div class="ai-status-indicator" [ngClass]="'status-' + candidate.status">
              <div class="status-icon-wrapper">
                <!-- Processing spinner -->
                <svg *ngIf="candidate.status === 'processing'" class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"/>
                </svg>
                <!-- Processed check -->
                <svg *ngIf="candidate.status === 'processed'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <!-- Error icon -->
                <svg *ngIf="candidate.status === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <!-- New/pending icon -->
                <svg *ngIf="candidate.status === 'new'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <!-- Other statuses -->
                <svg *ngIf="!['processing', 'processed', 'error', 'new'].includes(candidate.status)" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              <span class="status-label">{{ getStatusLabel(candidate.status) }}</span>
            </div>

            <!-- Action buttons -->
            <div class="ai-action-buttons">
              <!-- Process button (only for new/error) -->
              <button
                *ngIf="candidate.status === 'new' || candidate.status === 'error'"
                class="btn-ai-action btn-process"
                (click)="triggerProcess()"
                [disabled]="processingAction">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                {{ processingAction ? 'Starting...' : 'Process CV' }}
              </button>

              <!-- Reprocess button (only for processed/error) -->
              <button
                *ngIf="candidate.status === 'processed' || candidate.status === 'error'"
                class="btn-ai-action btn-reprocess"
                (click)="confirmReprocess()"
                [disabled]="processingAction">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                {{ processingAction ? 'Reprocessing...' : 'Reprocess' }}
              </button>

              <!-- Download CV button -->
              <a
                *ngIf="cvPreview?.cvReady"
                [href]="candidateService.getCvPdfDownloadUrl(candidate.documentId)"
                target="_blank"
                class="btn-ai-action btn-download-cv">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download CV (PDF)
              </a>
            </div>
          </div>

          <div class="alert error ai-error" *ngIf="candidate.status === 'error' && candidate.hrNotes">
            {{ candidate.hrNotes }}
          </div>

          <!-- Reprocess confirmation dialog -->
          <div class="confirm-dialog-overlay" *ngIf="showReprocessConfirm" (click)="cancelReprocess()">
            <div class="confirm-dialog" (click)="$event.stopPropagation()">
              <div class="dialog-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h3>Reprocess CV?</h3>
              <p>This will re-parse the CV and recalculate the score. The current extracted data and generated CV will be overwritten.</p>
              <div class="dialog-actions">
                <button class="btn-cancel" (click)="cancelReprocess()">Cancel</button>
                <button class="btn-confirm" (click)="executeReprocess()">Yes, Reprocess</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════ -->
        <!-- SPRINT 3: CV Template Picker -->
        <!-- ══════════════════════════════════════════════════════════════════ -->
        <div class="template-section" *ngIf="cvTemplates.length > 0">
          <div class="section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            CV Template
          </div>

          <div class="template-grid">
            <div
              *ngFor="let template of cvTemplates"
              class="template-card"
              [class.selected]="selectedTemplateKey === template.key"
              (click)="selectTemplate(template.key)">
              <div class="template-preview" [ngClass]="'preview-' + template.key">
                <div class="template-thumb">
                  <!-- Simple visual representation -->
                  <div class="thumb-header"></div>
                  <div class="thumb-content">
                    <div class="thumb-line"></div>
                    <div class="thumb-line short"></div>
                    <div class="thumb-line"></div>
                  </div>
                </div>
              </div>
              <div class="template-info">
                <div class="template-name">{{ template.name }}</div>
                <div class="template-desc">{{ template.description }}</div>
              </div>
              <div class="selected-badge" *ngIf="selectedTemplateKey === template.key">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════ -->
        <!-- SPRINT 3: Standardized CV Preview -->
        <!-- ══════════════════════════════════════════════════════════════════ -->
        <div class="cv-preview-section" *ngIf="cvPreview?.cvReady">
          <div class="cv-preview-header">
            <div class="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Standardized CV Preview
            </div>
            <div class="preview-controls">
              <button class="btn-zoom" (click)="zoomOut()" [disabled]="cvZoom <= 0.5">−</button>
              <span class="zoom-level">{{ (cvZoom * 100) | number:'1.0-0' }}%</span>
              <button class="btn-zoom" (click)="zoomIn()" [disabled]="cvZoom >= 1.5">+</button>
            </div>
          </div>

          <div class="cv-preview-container" [style.transform]="'scale(' + cvZoom + ')'" [style.transformOrigin]="'top center'">
            <div class="cv-preview-content" [innerHTML]="sanitizedCvHtml"></div>
          </div>
        </div>

        <!-- CV not ready message -->
        <div class="cv-not-ready" *ngIf="cvPreview && !cvPreview.cvReady && candidate.status !== 'processing'">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9aa0b4" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>{{ cvPreview.message || 'CV not yet generated. Click "Process CV" to start.' }}</span>
        </div>

        <!-- Extracted Data Summary -->
        <div class="extracted-data-section" *ngIf="cvPreview?.extractedData">
          <div class="section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            Extracted Data Summary
          </div>

          <div class="extracted-data-grid">
            <!-- Skills -->
            <div class="data-card" *ngIf="cvPreview?.extractedData?.skills?.length">
              <div class="data-label">Skills ({{ cvPreview?.extractedData?.skills?.length }})</div>
              <div class="skills-list">
                <span class="skill-chip" *ngFor="let skill of cvPreview?.extractedData?.skills || []">{{ skill }}</span>
              </div>
            </div>

            <!-- Experience -->
            <div class="data-card" *ngIf="cvPreview?.extractedData?.experience?.length">
              <div class="data-label">Experience ({{ cvPreview?.extractedData?.experience?.length }} roles)</div>
              <div class="experience-summary">
                <div class="exp-item" *ngFor="let exp of (cvPreview?.extractedData?.experience || []).slice(0, 3)">
                  <strong>{{ exp.title }}</strong> at {{ exp.company }}
                  <span class="exp-dates">{{ exp.startDate }} - {{ exp.endDate }}</span>
                </div>
                <div class="more-indicator" *ngIf="(cvPreview?.extractedData?.experience?.length || 0) > 3">
                  +{{ (cvPreview?.extractedData?.experience?.length || 0) - 3 }} more
                </div>
              </div>
            </div>

            <!-- Education -->
            <div class="data-card" *ngIf="cvPreview?.extractedData?.education?.length">
              <div class="data-label">Education</div>
              <div class="education-summary">
                <div class="edu-item" *ngFor="let edu of cvPreview?.extractedData?.education || []">
                  <strong>{{ edu.degree }}</strong>
                  <span>{{ edu.school }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </ng-container>
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
    $warning: #d97706;
    $error: #dc2626;

    .page {
      max-width: 1100px;
      margin: 28px auto;
      padding: 0 24px 60px;
    }

    /* Back link */
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: $gray-400;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      margin-bottom: 24px;
      transition: color 0.2s;
    }
    .back-link:hover { color: $red; }

    /* Skeleton */
    .skeleton-page { }
    .sk {
      border-radius: 12px;
      background: linear-gradient(90deg, #f1f3f7 25%, #f9fafb 50%, #f1f3f7 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      margin-bottom: 16px;
    }
    .sk-title { height: 40px; width: 40%; }
    .sk-sub   { height: 20px; width: 55%; }
    .sk-grid  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px; }
    .sk-card  { height: 140px; }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    /* Alert */
    .alert.error {
      padding: 16px 20px;
      border-radius: 12px;
      background: #fff5f5;
      color: $error;
      border: 1px solid rgba($error, 0.2);
      font-size: 14px;
    }

    .ai-error {
      margin-top: 12px;
    }

    /* Hero */
    .hero {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      background: linear-gradient(135deg, #1c1c28, #252b3b);
      border-radius: 24px;
      padding: 28px 32px;
      margin-bottom: 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    }
    .avatar-big {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, $red-deep, $red-mid);
      color: #fff;
      font-size: 26px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 16px rgba($red, 0.35);
    }
    .hero-info { flex: 1; }
    .candidate-name {
      margin: 0 0 10px;
      font-size: 1.7rem;
      font-weight: 800;
      color: #fff;
    }
    .hero-meta { display: flex; flex-wrap: wrap; gap: 8px; }
    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      background: rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.8);
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      transition: background 0.2s;
    }
    .email-chip:hover { background: rgba(255,255,255,0.18); }
    .hero-actions { flex-shrink: 0; }

    /* Status badge */
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .large-badge { font-size: 13px; padding: 8px 20px; }
    .badge-new         { background: rgba(#3b82f6, 0.12); color: #1d4ed8; }
    .badge-processing  { background: rgba($warning, 0.12); color: $warning; }
    .badge-processed   { background: rgba($warning, 0.12); color: darken($warning, 5%); }
    .badge-reviewing   { background: rgba(#8b5cf6, 0.12); color: #6d28d9; }
    .badge-shortlisted { background: rgba($success, 0.14); color: $success; }
    .badge-rejected    { background: rgba($error, 0.12); color: $error; }
    .badge-hired       { background: rgba($success, 0.2);  color: darken($success, 10%); }
    .badge-error       { background: rgba($error, 0.12);  color: $error; }

    /* Cards grid */
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 18px;
      margin-bottom: 20px;
    }
    .card {
      background: #fff;
      border-radius: 18px;
      padding: 22px 24px;
      border: 1px solid $gray-200;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }
    .card-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: $gray-400;
      margin-bottom: 16px;
    }
    .stat-value { margin-bottom: 8px; }
    .card-sub { font-size: 12px; color: $gray-400; margin-top: 4px; }

    /* Score card */
    .card-score { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .score-display { position: relative; width: 80px; height: 80px; margin: 8px auto; }
    .score-ring { width: 80px; height: 80px; }
    .score-num {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 800;
      color: $gray-800;
    }
    .score-label { font-size: 11px; color: $gray-400; margin-top: 4px; }

    /* GDPR card */
    .gdpr-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .gdpr-key { color: $gray-600; }
    .gdpr-val { font-weight: 600; color: $gray-800; }
    .gdpr-val.yes { color: $success; }
    .gdpr-val.no  { color: $error; }

    /* Links */
    .links { display: flex; flex-direction: column; gap: 10px; }
    .external-link {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }
    .linkedin-link { background: rgba(#0077b5, 0.08); color: #0077b5; }
    .linkedin-link:hover { background: rgba(#0077b5, 0.15); }
    .portfolio-link { background: rgba($gray-600, 0.08); color: $gray-700; }
    .portfolio-link:hover { background: rgba($gray-600, 0.15); }

    /* Notes */
    .notes-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 20px; }
    @media (max-width: 700px) { .notes-row { grid-template-columns: 1fr; } }

    .note-card {
      background: #fff;
      border-radius: 18px;
      padding: 22px 24px;
      border: 1px solid $gray-200;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }
    .note-card-hr { border-left: 4px solid $red; }
    .note-placeholder { border-left: 4px solid $gray-200; }
    .note-header {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: $gray-400;
      margin-bottom: 14px;
    }
    .note-text { font-size: 14px; color: $gray-700; line-height: 1.65; margin: 0; white-space: pre-wrap; }
    .note-text.placeholder { color: $gray-300; font-style: italic; }

    /* Resume section */
    .resume-section {
      background: #fff;
      border-radius: 20px;
      border: 1px solid $gray-200;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      padding: 24px;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: $gray-600;
      margin-bottom: 20px;
    }
    .resume-card {
      display: flex;
      align-items: center;
      gap: 18px;
      background: linear-gradient(135deg, $gray-50, #fff);
      border: 1px solid $gray-200;
      border-radius: 16px;
      padding: 20px 24px;
    }
    .resume-icon {
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, $red-deep, $red);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      flex-shrink: 0;
      box-shadow: 0 4px 14px rgba($red, 0.3);
    }
    .resume-info { flex: 1; }
    .resume-name { font-size: 15px; font-weight: 700; color: $gray-800; margin-bottom: 6px; }
    .resume-meta { display: flex; align-items: center; gap: 10px; font-size: 12px; color: $gray-400; }
    .mime-badge {
      padding: 2px 8px;
      background: rgba($red, 0.07);
      color: $red-deep;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
    }

    .btn-download {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: linear-gradient(135deg, $red-deep, $red);
      color: #fff;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.25s;
      box-shadow: 0 4px 16px rgba($red, 0.3);
      flex-shrink: 0;
    }
    .btn-download:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba($red, 0.4);
    }

    .no-resume {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px;
      color: $gray-400;
      font-size: 14px;
    }

    /* Edit buttons and forms */
    .btn-edit, .btn-edit-notes {
      background: none;
      border: none;
      cursor: pointer;
      color: $gray-400;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-edit:hover, .btn-edit-notes:hover {
      background: rgba($red, 0.08);
      color: $red;
    }

    .btn-save, .btn-cancel {
      padding: 10px 18px;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-save {
      background: linear-gradient(135deg, $red-deep, $red);
      color: #fff;
      box-shadow: 0 2px 8px rgba($red, 0.2);
    }
    .btn-save:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba($red, 0.3);
    }
    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-cancel {
      background: $gray-100;
      color: $gray-600;
      margin-left: 8px;
    }
    .btn-cancel:hover:not(:disabled) {
      background: $gray-200;
    }
    .btn-cancel:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .status-select {
      padding: 8px 12px;
      border: 1px solid $gray-300;
      border-radius: 10px;
      font-size: 14px;
      color: $gray-800;
      background: #fff;
      cursor: pointer;
      margin-right: 8px;
    }
    .status-select:focus {
      outline: none;
      border-color: $red;
      box-shadow: 0 0 0 3px rgba($red, 0.1);
    }
    .status-select:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .notes-textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid $gray-300;
      border-radius: 10px;
      font-size: 14px;
      font-family: inherit;
      color: $gray-800;
      resize: vertical;
      min-height: 100px;
      margin-bottom: 12px;
    }
    .notes-textarea:focus {
      outline: none;
      border-color: $red;
      box-shadow: 0 0 0 3px rgba($red, 0.1);
    }
    .notes-textarea:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .notes-actions {
      display: flex;
      gap: 8px;
    }

    /* ══════════════════════════════════════════════════════════════════ */
    /* SPRINT 3: AI Processing Section */
    /* ══════════════════════════════════════════════════════════════════ */

    .ai-actions-section {
      background: #fff;
      border-radius: 20px;
      border: 1px solid $gray-200;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      padding: 24px;
      margin-top: 24px;
    }

    .ai-actions-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .ai-status-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
    }

    .ai-status-indicator.status-new {
      background: rgba(59, 130, 246, 0.1);
      color: #2563eb;
    }
    .ai-status-indicator.status-processing {
      background: rgba(245, 158, 11, 0.1);
      color: #d97706;
    }
    .ai-status-indicator.status-processed {
      background: rgba(34, 197, 94, 0.1);
      color: #16a34a;
    }
    .ai-status-indicator.status-error {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
    }
    .ai-status-indicator.status-reviewing {
      background: rgba(139, 92, 246, 0.1);
      color: #7c3aed;
    }
    .ai-status-indicator.status-shortlisted {
      background: rgba(34, 197, 94, 0.15);
      color: #15803d;
    }
    .ai-status-indicator.status-rejected {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
    }
    .ai-status-indicator.status-hired {
      background: rgba(234, 179, 8, 0.15);
      color: #a16207;
    }

    .status-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .ai-action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn-ai-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }

    .btn-process {
      background: linear-gradient(135deg, #16a34a, #22c55e);
      color: #fff;
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
    }
    .btn-process:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(22, 163, 74, 0.4);
    }

    .btn-reprocess {
      background: linear-gradient(135deg, #d97706, #f59e0b);
      color: #fff;
      box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);
    }
    .btn-reprocess:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(217, 119, 6, 0.4);
    }

    .btn-download-cv {
      background: linear-gradient(135deg, $red-deep, $red);
      color: #fff;
      box-shadow: 0 4px 12px rgba($red, 0.3);
    }
    .btn-download-cv:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba($red, 0.4);
    }

    .btn-ai-action:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    /* Confirmation dialog */
    .confirm-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .confirm-dialog {
      background: #fff;
      border-radius: 20px;
      padding: 32px;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    }

    .dialog-icon {
      margin-bottom: 16px;
    }

    .confirm-dialog h3 {
      margin: 0 0 12px;
      font-size: 20px;
      color: $gray-800;
    }

    .confirm-dialog p {
      margin: 0 0 24px;
      color: $gray-600;
      font-size: 14px;
      line-height: 1.6;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn-confirm {
      padding: 12px 24px;
      background: linear-gradient(135deg, #d97706, #f59e0b);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-confirm:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(217, 119, 6, 0.4);
    }

    /* ══════════════════════════════════════════════════════════════════ */
    /* SPRINT 3: CV Template Picker */
    /* ══════════════════════════════════════════════════════════════════ */

    .template-section {
      background: #fff;
      border-radius: 20px;
      border: 1px solid $gray-200;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      padding: 24px;
      margin-top: 24px;
    }

    .template-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }

    .template-card {
      position: relative;
      background: $gray-50;
      border: 2px solid $gray-200;
      border-radius: 16px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .template-card:hover {
      border-color: $gray-300;
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    }

    .template-card.selected {
      border-color: $red;
      background: rgba($red, 0.03);
      box-shadow: 0 0 0 3px rgba($red, 0.1);
    }

    .template-preview {
      height: 100px;
      border-radius: 10px;
      margin-bottom: 12px;
      overflow: hidden;
    }

    .template-thumb {
      width: 100%;
      height: 100%;
      background: #fff;
      padding: 8px;
      border-radius: 8px;
      box-shadow: inset 0 0 0 1px $gray-200;
    }

    .thumb-header {
      height: 20%;
      background: linear-gradient(135deg, $red, $red-mid);
      border-radius: 4px;
      margin-bottom: 6px;
    }

    .preview-experience_first .thumb-header { background: linear-gradient(135deg, #667eea, #764ba2); }
    .preview-skills_first .thumb-header { background: #1f2937; }
    .preview-compact .thumb-header { background: $gray-600; }
    .preview-education_first .thumb-header { background: $gray-800; }
    .preview-project_focus .thumb-header { background: #059669; }
    .preview-sidebar_photo .thumb-header { background: #111827; }
    .preview-accent_pink .thumb-header { background: #db2777; }
    .preview-teal_circle .thumb-header { background: #0d9488; }
    .preview-navy_gold .thumb-header { background: linear-gradient(135deg, #1e3a5f, #fbbf24); }
    .preview-sunset .thumb-header { background: linear-gradient(135deg, #f97316, #dc2626, #7c3aed); }

    .thumb-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .thumb-line {
      height: 6px;
      background: $gray-200;
      border-radius: 3px;
    }

    .thumb-line.short {
      width: 60%;
    }

    .template-info {
      text-align: center;
    }

    .template-name {
      font-size: 13px;
      font-weight: 700;
      color: $gray-800;
      margin-bottom: 4px;
    }

    .template-desc {
      font-size: 11px;
      color: $gray-400;
      line-height: 1.3;
    }

    .selected-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 24px;
      height: 24px;
      background: $red;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }

    /* ══════════════════════════════════════════════════════════════════ */
    /* SPRINT 3: CV Preview */
    /* ══════════════════════════════════════════════════════════════════ */

    .cv-preview-section {
      background: #fff;
      border-radius: 20px;
      border: 1px solid $gray-200;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      padding: 24px;
      margin-top: 24px;
    }

    .cv-preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .preview-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-zoom {
      width: 32px;
      height: 32px;
      border: 1px solid $gray-300;
      background: #fff;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-zoom:hover:not(:disabled) {
      background: $gray-100;
    }

    .btn-zoom:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .zoom-level {
      font-size: 13px;
      color: $gray-600;
      min-width: 40px;
      text-align: center;
    }

    .cv-preview-container {
      background: $gray-100;
      border-radius: 12px;
      padding: 24px;
      max-height: 600px;
      overflow: auto;
      transition: transform 0.2s;
    }

    .cv-preview-content {
      background: #fff;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      border-radius: 4px;
    }

    .cv-not-ready {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px;
      color: $gray-400;
      font-size: 14px;
      text-align: center;
      background: #fff;
      border-radius: 20px;
      border: 1px solid $gray-200;
      margin-top: 24px;
    }

    /* ══════════════════════════════════════════════════════════════════ */
    /* SPRINT 3: Extracted Data Summary */
    /* ══════════════════════════════════════════════════════════════════ */

    .extracted-data-section {
      background: #fff;
      border-radius: 20px;
      border: 1px solid $gray-200;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      padding: 24px;
      margin-top: 24px;
    }

    .extracted-data-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .data-card {
      background: $gray-50;
      border-radius: 12px;
      padding: 16px;
    }

    .data-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: $gray-600;
      margin-bottom: 12px;
    }

    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .skill-chip {
      padding: 4px 10px;
      background: rgba($red, 0.08);
      color: $red-deep;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .experience-summary, .education-summary {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .exp-item, .edu-item {
      font-size: 13px;
      color: $gray-700;
      line-height: 1.4;
    }

    .exp-item strong, .edu-item strong {
      color: $gray-800;
    }

    .exp-dates {
      display: block;
      font-size: 11px;
      color: $gray-400;
    }

    .more-indicator {
      font-size: 12px;
      color: $red;
      font-weight: 600;
    }
  `]
})
export class CandidateDetailComponent implements OnInit {
  candidate: CandidateDetail | null = null;
  loading = false;
  error = '';
  downloadUrl = '';

  // S2-US8: Status edit state
  editingStatus = false;
  statusOptions = ['new', 'processing', 'processed', 'reviewing', 'shortlisted', 'rejected', 'hired'];
  statusSaving = false;

  // S2-US9: Notes edit state
  editingNotes = false;
  notesDraft = '';
  notesSaving = false;

  // S3: AI Pipeline state
  cvTemplates: CvTemplateMeta[] = [];
  selectedTemplateKey: CvTemplateKey = 'standard';
  cvPreview: CvPreviewResponse | null = null;
  sanitizedCvHtml: SafeHtml | null = null;
  cvZoom = 1;
  processingAction = false;
  showReprocessConfirm = false;

  constructor(
    private route: ActivatedRoute,
    public candidateService: CandidateService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Invalid candidate ID.';
      return;
    }
    this.downloadUrl = this.buildDownloadUrl(id);
    this.load(id);
    this.loadCvTemplates();
  }

  load(id: string): void {
    this.loading = true;
    this.candidateService.getHrDetail(id).subscribe({
      next: (data) => {
        this.candidate = data;
        this.loading = false;
        this.selectedTemplateKey = (data as any).cvTemplateKey || 'standard';
        this.loadCvPreview(id);
      },
      error: (err) => {
        this.error = err?.error?.error?.message || 'Failed to load candidate details.';
        this.loading = false;
      }
    });
  }

  // S3: Load CV templates
  loadCvTemplates(): void {
    this.candidateService.getCvTemplates().subscribe({
      next: (templates) => { this.cvTemplates = templates; },
      error: (err) => { console.error('Failed to load CV templates:', err); }
    });
  }

  // S3: Load CV preview
  loadCvPreview(id: string): void {
    this.candidateService.getCvPreview(id).subscribe({
      next: (preview) => {
        this.cvPreview = preview;
        if (preview.cvHtml) {
          this.sanitizedCvHtml = this.sanitizer.bypassSecurityTrustHtml(preview.cvHtml);
        }
        if (preview.cvTemplateKey) {
          this.selectedTemplateKey = preview.cvTemplateKey;
        }
      },
      error: (err) => { console.error('Failed to load CV preview:', err); }
    });
  }

  buildDownloadUrl(id: string): string {
    const token = this.authService.getToken();
    // We open the link in new tab – the interceptor won't attach header there,
    // so we embed the token as a query param for this specific download endpoint.
    return `http://localhost:1337/api/candidates/hr/${id}/resume?token=${token}`;
  }

  getFileTypeLabel(mime: string): string {
    if (!mime) return 'FILE';
    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('word') || mime.includes('document')) return 'DOCX';
    if (mime.includes('msword')) return 'DOC';
    return mime.split('/')[1]?.toUpperCase() || 'FILE';
  }

  formatSize(kb: number): string {
    if (!kb) return '';
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  /**
   * S2-US8: Enter status edit mode
   */
  startEditStatus(): void {
    this.editingStatus = true;
  }

  /**
   * S2-US8: Save new status
   */
  saveStatus(newStatus: string): void {
    if (!this.candidate || newStatus === this.candidate.status) {
      this.editingStatus = false;
      return;
    }

    this.statusSaving = true;
    this.candidateService.updateStatus(this.candidate.documentId, newStatus).subscribe({
      next: (res) => {
        if (this.candidate) {
          this.candidate.status = res.status;
          this.candidate.updatedAt = res.updatedAt;
        }
        this.editingStatus = false;
        this.statusSaving = false;
      },
      error: (err) => {
        this.error = err?.error?.error?.message || 'Failed to update status.';
        this.statusSaving = false;
      }
    });
  }

  /**
   * S2-US9: Enter notes edit mode
   */
  startEditNotes(): void {
    this.editingNotes = true;
    this.notesDraft = this.candidate?.hrNotes || '';
  }

  /**
   * S2-US9: Save HR notes
   */
  saveNotes(): void {
    if (!this.candidate) return;

    this.notesSaving = true;
    this.candidateService.updateHrNotes(this.candidate.documentId, this.notesDraft).subscribe({
      next: (res) => {
        if (this.candidate) {
          this.candidate.hrNotes = res.hrNotes;
          this.candidate.updatedAt = res.updatedAt;
        }
        this.editingNotes = false;
        this.notesSaving = false;
      },
      error: (err) => {
        this.error = err?.error?.error?.message || 'Failed to update notes.';
        this.notesSaving = false;
      }
    });
  }

  /**
   * Cancel any edit mode
   */
  cancelEdit(): void {
    this.editingStatus = false;
    this.editingNotes = false;
    this.notesDraft = '';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SPRINT 3: AI Pipeline Methods
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get human-readable status label
   */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      new: 'New - Ready to Process',
      processing: 'Processing CV...',
      processed: 'CV Processed',
      reviewing: 'Under Review',
      shortlisted: 'Shortlisted',
      rejected: 'Rejected',
      hired: 'Hired',
      error: 'Processing Error'
    };
    return labels[status] || status;
  }

  /**
   * S3-US1: Trigger AI processing
   */
  triggerProcess(): void {
    if (!this.candidate) return;

    this.processingAction = true;
    this.candidateService.triggerProcess(this.candidate.documentId).subscribe({
      next: () => {
        if (this.candidate) {
          this.candidate.status = 'processing';
        }
        this.processingAction = false;
        // Poll for completion
        this.pollForCompletion();
      },
      error: (err) => {
        this.error = err?.error?.error?.message || 'Failed to start processing.';
        this.processingAction = false;
      }
    });
  }

  /**
   * S3-US8: Show reprocess confirmation dialog
   */
  confirmReprocess(): void {
    this.showReprocessConfirm = true;
  }

  /**
   * Cancel reprocess
   */
  cancelReprocess(): void {
    this.showReprocessConfirm = false;
  }

  /**
   * S3-US8: Execute reprocessing
   */
  executeReprocess(): void {
    if (!this.candidate) return;

    this.showReprocessConfirm = false;
    this.processingAction = true;

    this.candidateService.reprocess(this.candidate.documentId).subscribe({
      next: () => {
        if (this.candidate) {
          this.candidate.status = 'processing';
        }
        this.processingAction = false;
        this.cvPreview = null;
        this.sanitizedCvHtml = null;
        // Poll for completion
        this.pollForCompletion();
      },
      error: (err) => {
        this.error = err?.error?.error?.message || 'Failed to reprocess.';
        this.processingAction = false;
      }
    });
  }

  /**
   * Poll for processing completion
   */
  pollForCompletion(): void {
    if (!this.candidate) return;

    const id = this.candidate.documentId;
    const poll = setInterval(() => {
      this.candidateService.getHrDetail(id).subscribe({
        next: (data) => {
          if (data.status !== 'processing') {
            clearInterval(poll);
            this.candidate = data;
            this.loadCvPreview(id);
          }
        },
        error: () => {
          clearInterval(poll);
        }
      });
    }, 3000); // Poll every 3 seconds

    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(poll), 120000);
  }

  /**
   * S3-US6: Select CV template
   */
  selectTemplate(key: CvTemplateKey): void {
    if (!this.candidate || key === this.selectedTemplateKey) return;

    this.selectedTemplateKey = key;
    this.candidateService.updateCvTemplate(this.candidate.documentId, key).subscribe({
      next: () => {
        // If already processed, reprocess to regenerate CV with new template
        if (this.candidate?.status === 'processed') {
          this.executeReprocess();
        }
      },
      error: (err) => {
        this.error = err?.error?.error?.message || 'Failed to update template.';
      }
    });
  }

  /**
   * Zoom in CV preview
   */
  zoomIn(): void {
    if (this.cvZoom < 1.5) {
      this.cvZoom += 0.1;
    }
  }

  /**
   * Zoom out CV preview
   */
  zoomOut(): void {
    if (this.cvZoom > 0.5) {
      this.cvZoom -= 0.1;
    }
  }
}
