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
import { LocationMapComponent } from '../../components/location-map/location-map.component';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-candidate-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LocationMapComponent],
  template: `
    <div class="page">
      <!-- Back navigation -->
      <a routerLink="/candidates" class="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        {{ i18n.t('candidateDetail.back') }}
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
                {{ candidate.selfReportedYearsExperience }}
                {{ candidate.selfReportedYearsExperience === 1 ? i18n.t('candidateDetail.yearExp') : i18n.t('candidateDetail.yearsExp') }}
              </span>
            </div>
          </div>
          <div class="hero-actions">
            <span class="status-badge" [ngClass]="'badge-' + candidate.status">{{ getStatusShortLabel(candidate.status) }}</span>
          </div>
        </div>

        <!-- Cards grid -->
        <div class="cards">

          <!-- Score card -->
          <div class="card card-score">
            <div class="card-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              {{ i18n.t('candidateDetail.aiScore') }}
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
            <div class="score-label">{{ i18n.t('candidateDetail.outOf100') }}</div>
          </div>

          <!-- Status card -->
          <div class="card">
            <div class="card-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              {{ i18n.t('candidateDetail.applicationStatus') }}
            </div>
            <div class="stat-value">
              <ng-container *ngIf="!editingStatus">
                <span class="status-badge large-badge" [ngClass]="'badge-' + candidate.status">{{ getStatusShortLabel(candidate.status) }}</span>
                <button class="btn-edit" (click)="startEditStatus()" [title]="i18n.t('candidateDetail.editStatus')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </ng-container>
              <ng-container *ngIf="editingStatus">
                <select class="status-select" [(ngModel)]="statusDraft" [disabled]="statusSaving">
                  <option *ngFor="let status of statusOptions" [value]="status">{{ getStatusShortLabel(status) }}</option>
                </select>
                <button class="btn-save" (click)="saveStatus()" [disabled]="statusSaving">
                  {{ statusSaving ? i18n.t('candidateDetail.saving') : i18n.t('candidateDetail.save') }}
                </button>
                <button class="btn-cancel" (click)="cancelEdit()" [disabled]="statusSaving">{{ i18n.t('candidateDetail.cancel') }}</button>
              </ng-container>
            </div>
            <div class="card-sub">{{ i18n.t('candidateDetail.applied') }} {{ candidate.createdAt | date:'dd MMM yyyy' }}</div>
            <div class="card-sub" *ngIf="candidate.updatedAt !== candidate.createdAt">
              {{ i18n.t('candidateDetail.updated') }} {{ candidate.updatedAt | date:'dd MMM yyyy' }}
            </div>
          </div>

          <!-- GDPR card -->
          <div class="card card-gdpr">
            <div class="card-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              {{ i18n.t('candidateDetail.gdprConsent') }}
            </div>
            <div class="gdpr-row">
              <span class="gdpr-key">{{ i18n.t('candidateDetail.consentGiven') }}</span>
              <span class="gdpr-val" [class.yes]="candidate.consent" [class.no]="!candidate.consent">
                {{ candidate.consent ? i18n.t('candidateDetail.consentYes') : i18n.t('candidateDetail.consentNo') }}
              </span>
            </div>
            <div class="gdpr-row" *ngIf="candidate.consentAt">
              <span class="gdpr-key">{{ i18n.t('candidateDetail.consentDate') }}</span>
              <span class="gdpr-val">{{ candidate.consentAt | date:'dd MMM yyyy, HH:mm' }}</span>
            </div>
            <div class="gdpr-row" *ngIf="candidate.retentionUntil">
              <span class="gdpr-key">{{ i18n.t('candidateDetail.retainUntil') }}</span>
              <span class="gdpr-val">{{ candidate.retentionUntil | date:'dd MMM yyyy' }}</span>
            </div>
          </div>

          <!-- Links card -->
          <div class="card" *ngIf="candidate.linkedin || candidate.portfolio">
            <div class="card-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              {{ i18n.t('candidateDetail.links') }}
            </div>
            <div class="links">
              <a *ngIf="candidate.linkedin" [href]="candidate.linkedin" target="_blank" rel="noopener" class="external-link linkedin-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                {{ i18n.t('candidateDetail.linkedinProfile') }}
              </a>
              <a *ngIf="candidate.portfolio" [href]="candidate.portfolio" target="_blank" rel="noopener" class="external-link portfolio-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                {{ i18n.t('candidateDetail.portfolioWebsite') }}
              </a>
            </div>
          </div>

          <!-- Location card (candidate-provided) -->
          <div class="card card-location">
            <div class="card-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {{ i18n.t('candidateDetail.location') }}
            </div>
            <div class="location-card-body">
              <app-location-map *ngIf="candidateLocation" [location]="candidateLocation" [height]="360"></app-location-map>
              <span *ngIf="!candidateLocation" class="text-muted">{{ i18n.t('candidateDetail.locationNotAvailable') }}</span>
            </div>
          </div>
        </div>

        <!-- Notes row -->
        <div class="notes-row">
          <div class="note-card" *ngIf="candidate.candidateNotes">
            <div class="note-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              {{ i18n.t('candidateDetail.candidateNote') }}
            </div>
            <p class="note-text">{{ candidate.candidateNotes }}</p>
          </div>

          <div class="note-card note-card-hr" *ngIf="candidate.hrNotes && !editingNotes">
            <div class="note-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {{ i18n.t('candidateDetail.hrNotes') }}
              <button class="btn-edit-notes" (click)="startEditNotes()" [title]="i18n.t('candidateDetail.editNotes')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
            <p class="note-text">{{ candidate.hrNotes }}</p>
          </div>

          <div class="note-card note-card-hr" *ngIf="editingNotes">
            <div class="note-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {{ i18n.t('candidateDetail.hrNotesEditing') }}
            </div>
            <textarea [(ngModel)]="notesDraft" class="notes-textarea" [disabled]="notesSaving" [placeholder]="i18n.t('candidateDetail.hrNotesPlaceholder')"></textarea>
            <div class="notes-actions">
              <button class="btn-save" (click)="saveNotes()" [disabled]="notesSaving">
                {{ notesSaving ? i18n.t('candidateDetail.saving') : i18n.t('candidateDetail.saveNotes') }}
              </button>
              <button class="btn-cancel" (click)="cancelEdit()" [disabled]="notesSaving">{{ i18n.t('candidateDetail.cancel') }}</button>
            </div>
          </div>

          <div class="note-card note-placeholder" *ngIf="!candidate.hrNotes && !editingNotes">
            <div class="note-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {{ i18n.t('candidateDetail.hrNotes') }}
              <button class="btn-edit-notes" (click)="startEditNotes()" [title]="i18n.t('candidateDetail.addNotes')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
            <p class="note-text placeholder">{{ i18n.t('candidateDetail.noHrNotes') }}</p>
          </div>
        </div>

        <!-- Resume section -->
        <div class="resume-section">
          <div class="resume-header">
            <div class="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              {{ i18n.t('candidateDetail.resume') }}
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
              {{ i18n.t('candidateDetail.downloadResume') }}
            </a>
          </div>

          <ng-template #noResume>
            <div class="no-resume">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd0dc" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>{{ i18n.t('candidateDetail.noResume') }}</span>
            </div>
          </ng-template>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════ -->
        <!-- SPRINT 3: AI Processing Actions -->
        <!-- ══════════════════════════════════════════════════════════════════ -->
        <div class="ai-actions-section">
          <div class="section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><path d="M7.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/><path d="M16.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>
            {{ i18n.t('candidateDetail.aiProcessing') }}
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
                {{ processingAction ? i18n.t('candidateDetail.starting') : i18n.t('candidateDetail.processCv') }}
              </button>

              <!-- Reprocess button -->
              <button
                class="btn-ai-action btn-reprocess"
                (click)="confirmReprocess()"
                [disabled]="processingAction">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                {{ processingAction ? i18n.t('candidateDetail.reprocessing') : i18n.t('candidateDetail.reprocess') }}
              </button>

              <!-- Download CV button -->
              <a
                *ngIf="cvPreview?.cvReady"
                [href]="candidateService.getCvPdfDownloadUrl(candidate.documentId, undefined, selectedTemplateKey)"
                target="_blank"
                class="btn-ai-action btn-download-cv">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {{ i18n.t('candidateDetail.downloadCvPdf') }}
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
              <h3>{{ i18n.t('candidateDetail.reprocessTitle') }}</h3>
              <p>{{ i18n.t('candidateDetail.reprocessDesc') }}</p>
              <div class="dialog-actions">
                <button class="btn-cancel" (click)="cancelReprocess()">{{ i18n.t('candidateDetail.cancel') }}</button>
                <button class="btn-confirm" (click)="executeReprocess()">{{ i18n.t('candidateDetail.confirmReprocess') }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════ -->
        <!-- SPRINT 3: CV Template Override -->
        <!-- ══════════════════════════════════════════════════════════════════ -->
        <div class="template-override-section" *ngIf="cvTemplates.length > 0">
          <div class="section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            {{ i18n.t('candidateDetail.cvTemplateOverride') }}
          </div>

          <div class="template-override-card">
            <div class="template-override-info">
              <div class="template-override-title">{{ i18n.t('candidateDetail.templateApplyDifferent') }}</div>
              <div class="template-override-sub">
                {{ i18n.t('candidateDetail.templateGlobalDefault') }} <strong>{{ getTemplateName(defaultTemplateKey) }}</strong>
              </div>
            </div>
            <div class="template-override-control">
              <select
                class="template-select"
                [(ngModel)]="selectedTemplateKey"
                (ngModelChange)="selectTemplate($event)"
              >
                <option *ngFor="let template of cvTemplates" [value]="template.key">{{ template.name }}</option>
              </select>
              <div class="template-override-note" *ngIf="selectedTemplateKey === defaultTemplateKey">
                {{ i18n.t('candidateDetail.templateUsingGlobal') }}
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
              {{ i18n.t('candidateDetail.standardizedPreview') }}
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
          <span>{{ cvPreview.message || i18n.t('candidateDetail.cvNotGenerated') }}</span>
        </div>

        <!-- Parsed CV Details -->
        <div class="parsed-cv-section" *ngIf="cvPreview?.extractedData as extracted">
          <div class="section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            {{ i18n.t('candidateDetail.parsedDetails') }}
          </div>
          <p class="section-subtitle">{{ i18n.t('candidateDetail.parsedSubtitle') }}</p>

          <ng-container *ngIf="getExtractedContact(extracted) as contact">
            <div class="parsed-grid">
              <section class="parsed-card">
                <div class="parsed-card-title">{{ i18n.t('candidateDetail.personalDetails') }}</div>
                <div class="kv-grid">
                  <div class="kv-item">
                    <div class="kv-label">{{ i18n.t('candidateDetail.fullName') }}</div>
                    <div class="kv-value">{{ contact.fullName }}</div>
                  </div>
                  <div class="kv-item">
                    <div class="kv-label">{{ i18n.t('candidateDetail.email') }}</div>
                    <div class="kv-value">
                      <a *ngIf="contact.email !== '-'" [href]="'mailto:' + contact.email" class="kv-link">{{ contact.email }}</a>
                      <span *ngIf="contact.email === '-'">-</span>
                    </div>
                  </div>
                  <div class="kv-item">
                    <div class="kv-label">{{ i18n.t('candidateDetail.phone') }}</div>
                    <div class="kv-value">{{ contact.phone }}</div>
                  </div>
                  <div class="kv-item kv-item-full">
                    <div class="kv-label">{{ i18n.t('candidateDetail.location') }}</div>
                    <div class="kv-value location-value">
                      <span>{{ contact.location }}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section class="parsed-card">
                <div class="parsed-card-title">{{ i18n.t('candidateDetail.summary') }}</div>
                <p class="parsed-text">{{ getSummaryText(extracted) }}</p>
              </section>

              <section class="parsed-card">
                <div class="parsed-card-title">{{ i18n.t('candidateDetail.linksProfiles') }}</div>
                <div class="link-list" *ngIf="getContactLinks(extracted).length; else noLinks">
                  <a class="link-pill" *ngFor="let link of getContactLinks(extracted)" [href]="link.url" target="_blank" rel="noopener">
                    <span class="link-label">{{ link.label }}</span>
                    <span class="link-url">{{ link.display }}</span>
                  </a>
                </div>
                <ng-template #noLinks>
                  <div class="text-muted">{{ i18n.t('candidateDetail.noLinks') }}</div>
                </ng-template>
              </section>

              <section class="parsed-card">
                <div class="parsed-card-title">{{ i18n.t('candidateDetail.skillsCompetencies') }}</div>
                <div class="chip-wrap" *ngIf="getSkills(extracted).length; else noSkills">
                  <span class="chip" *ngFor="let skill of getSkills(extracted)">{{ skill }}</span>
                </div>
                <ng-template #noSkills>
                  <div class="text-muted">{{ i18n.t('candidateDetail.noSkills') }}</div>
                </ng-template>

                <div class="chip-subtitle" *ngIf="getCompetencies(extracted).length">{{ i18n.t('candidateDetail.competencies') }}</div>
                <div class="chip-wrap" *ngIf="getCompetencies(extracted).length">
                  <span class="chip chip-soft" *ngFor="let comp of getCompetencies(extracted)">{{ comp }}</span>
                </div>
              </section>

              <section class="parsed-card span-2" *ngIf="getScoreExplanation(extracted) as scoreExp">
                <div class="score-header">
                  <div class="parsed-card-title">{{ i18n.t('candidateDetail.scoreExplanation') }}</div>
                  <span class="score-pill" [ngClass]="'score-' + scoreExp.qualityTone">{{ scoreExp.qualityLabel }}</span>
                </div>
                <p class="score-formula">{{ i18n.t('candidateDetail.scoreFormula') }}</p>

                <div class="score-bars">
                  <div class="score-row">
                    <div class="score-label">{{ i18n.t('candidateDetail.finalScore') }}</div>
                    <div class="score-track">
                      <div class="score-fill" [style.width.%]="scoreExp.score"></div>
                    </div>
                    <div class="score-value">{{ scoreExp.score | number:'1.0-0' }}</div>
                  </div>
                  <div class="score-row">
                    <div class="score-label">{{ i18n.t('candidateDetail.fitScore') }}</div>
                    <div class="score-track">
                      <div class="score-fill score-fill-alt" [style.width.%]="scoreExp.fitScore"></div>
                    </div>
                    <div class="score-value">{{ scoreExp.fitScore | number:'1.0-0' }}</div>
                  </div>
                  <div class="score-row">
                    <div class="score-label">{{ i18n.t('candidateDetail.completeness') }}</div>
                    <div class="score-track">
                      <div class="score-fill score-fill-soft" [style.width.%]="scoreExp.completenessScore"></div>
                    </div>
                    <div class="score-value">{{ scoreExp.completenessScore | number:'1.0-0' }}</div>
                  </div>
                </div>

                <div class="score-rationale" *ngIf="getScoreRationale(extracted) as rationale">
                  <div class="score-subtitle">{{ i18n.t('candidateDetail.whyScore') }}</div>
                  <ul class="rationale-list">
                    <li>{{ i18n.t('candidateDetail.requiredSkillsMatched') }} {{ rationale.requiredMatched }}/{{ rationale.requiredTotal }}</li>
                    <li *ngIf="rationale.niceToHaveMatched > 0">{{ i18n.t('candidateDetail.niceToHaveMatched') }} {{ rationale.niceToHaveMatched }}</li>
                    <li *ngIf="rationale.experienceYears !== null">
                      {{ i18n.t('candidateDetail.experienceDetected') }} {{ rationale.experienceYears | number:'1.0-1' }} {{ i18n.t('candidateDetail.years') }} ({{ rationale.experienceLabel }})
                    </li>
                    <li>{{ i18n.t('candidateDetail.completenessScore') }} {{ rationale.completenessScore | number:'1.0-0' }} / 100</li>
                  </ul>
                  <div class="rationale-missing" *ngIf="rationale.missingFields.length">
                    <div class="score-subtitle">{{ i18n.t('candidateDetail.missingData') }}</div>
                    <div class="chip-wrap">
                      <span class="chip chip-negative" *ngFor="let field of rationale.missingFields">{{ field }}</span>
                    </div>
                  </div>
                </div>

                <div class="score-details">
                  <div class="score-block">
                    <div class="score-subtitle">{{ i18n.t('candidateDetail.requiredSkills') }}</div>
                    <div class="chip-wrap" *ngIf="scoreExp.skillsMatched.length">
                      <span class="chip chip-positive" *ngFor="let skill of scoreExp.skillsMatched">{{ skill }}</span>
                    </div>
                    <div class="chip-wrap" *ngIf="scoreExp.skillsMissing.length">
                      <span class="chip chip-negative" *ngFor="let skill of scoreExp.skillsMissing">{{ skill }}</span>
                    </div>
                    <div class="text-muted" *ngIf="!scoreExp.skillsMatched.length && !scoreExp.skillsMissing.length">
                      {{ i18n.t('candidateDetail.noRequiredSkills') }}
                    </div>
                  </div>

                  <div class="score-block">
                    <div class="score-subtitle">{{ i18n.t('candidateDetail.niceToHaveSkills') }}</div>
                    <div class="chip-wrap" *ngIf="scoreExp.niceToHaveMatched.length">
                      <span class="chip chip-soft" *ngFor="let skill of scoreExp.niceToHaveMatched">{{ skill }}</span>
                    </div>
                    <div class="text-muted" *ngIf="!scoreExp.niceToHaveMatched.length">{{ i18n.t('candidateDetail.noNiceToHave') }}</div>
                  </div>

                  <div class="score-block">
                    <div class="score-subtitle">{{ i18n.t('candidateDetail.experience') }}</div>
                    <div class="score-metric">{{ i18n.t('candidateDetail.detected') }} {{ scoreExp.experienceYears | number:'1.0-1' }} {{ i18n.t('candidateDetail.years') }}</div>
                    <div class="score-metric" *ngIf="scoreExp.experienceMatch !== null">
                      {{ i18n.t('candidateDetail.requirement') }} <span [class.score-ok]="scoreExp.experienceMatch" [class.score-warn]="scoreExp.experienceMatch === false">
                        {{ scoreExp.experienceMatch ? i18n.t('candidateDetail.requirementMet') : i18n.t('candidateDetail.requirementNotMet') }}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section class="parsed-card span-2">
                <div class="parsed-card-title">{{ i18n.t('candidateDetail.workExperience') }}</div>
                <div class="timeline" *ngIf="getExperienceItems(extracted).length; else noExperience">
                  <div class="timeline-item" *ngFor="let exp of getExperienceItems(extracted)">
                    <div class="timeline-marker">W</div>
                    <div class="timeline-body">
                      <div class="timeline-title">{{ exp.title || i18n.t('candidateDetail.rolePlaceholder') }}</div>
                      <div class="timeline-sub">
                        {{ exp.company || i18n.t('candidateDetail.companyPlaceholder') }}
                        <span class="timeline-dot">•</span>
                        {{ formatDateRange(exp.startDate, exp.endDate) }}
                      </div>
                      <ul class="timeline-list" *ngIf="exp.highlights?.length">
                        <li *ngFor="let h of exp.highlights">{{ h }}</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <ng-template #noExperience>
                  <div class="text-muted">{{ i18n.t('candidateDetail.noExperience') }}</div>
                </ng-template>
              </section>

              <section class="parsed-card">
                <div class="parsed-card-title">{{ i18n.t('candidateDetail.education') }}</div>
                <div class="timeline" *ngIf="getEducationItems(extracted).length; else noEducation">
                  <div class="timeline-item" *ngFor="let edu of getEducationItems(extracted)">
                    <div class="timeline-marker">E</div>
                    <div class="timeline-body">
                      <div class="timeline-title">{{ edu.degree || i18n.t('candidateDetail.educationPlaceholder') }}</div>
                      <div class="timeline-sub">
                        {{ edu.school || i18n.t('candidateDetail.schoolPlaceholder') }}
                        <span class="timeline-dot">•</span>
                        {{ formatDateRange(edu.startDate, edu.endDate) }}
                      </div>
                    </div>
                  </div>
                </div>
                <ng-template #noEducation>
                  <div class="text-muted">{{ i18n.t('candidateDetail.noEducation') }}</div>
                </ng-template>
              </section>

              <section class="parsed-card">
                <div class="parsed-card-title">{{ i18n.t('candidateDetail.projects') }}</div>
                <div class="project-grid" *ngIf="getProjects(extracted).length; else noProjects">
                  <div class="project-card" *ngFor="let proj of getProjects(extracted)">
                    <div class="project-title">{{ proj.name || i18n.t('candidateDetail.projectPlaceholder') }}</div>
                    <div class="project-desc">{{ proj.description || i18n.t('candidateDetail.noProjectDescription') }}</div>
                    <div class="project-links" *ngIf="proj.links.length">
                      <a *ngFor="let link of proj.links" [href]="normalizeUrl(link)" target="_blank" rel="noopener">{{ link }}</a>
                    </div>
                  </div>
                </div>
                <ng-template #noProjects>
                  <div class="text-muted">{{ i18n.t('candidateDetail.noProjects') }}</div>
                </ng-template>
              </section>

              <section class="parsed-card span-2">
                <div class="parsed-card-title">{{ i18n.t('candidateDetail.additionalInfo') }}</div>
                <div class="info-group">
                  <div class="info-label">{{ i18n.t('candidateDetail.certifications') }}</div>
                  <div class="chip-wrap" *ngIf="getCertifications(extracted).length; else noCerts">
                    <span class="chip chip-soft" *ngFor="let cert of getCertifications(extracted)">{{ cert }}</span>
                  </div>
                  <ng-template #noCerts>
                    <div class="text-muted">{{ i18n.t('candidateDetail.noCertifications') }}</div>
                  </ng-template>
                </div>

                <div class="info-group">
                  <div class="info-label">{{ i18n.t('candidateDetail.languages') }}</div>
                  <div class="chip-wrap" *ngIf="getLanguages(extracted).length; else noLangs">
                    <span class="chip chip-soft" *ngFor="let lang of getLanguages(extracted)">{{ lang }}</span>
                  </div>
                  <ng-template #noLangs>
                    <div class="text-muted">{{ i18n.t('candidateDetail.noLanguages') }}</div>
                  </ng-template>
                </div>

                <div class="info-group">
                  <div class="info-label">{{ i18n.t('candidateDetail.qualities') }}</div>
                  <div class="chip-wrap" *ngIf="getQualities(extracted).length; else noQualities">
                    <span class="chip chip-soft" *ngFor="let q of getQualities(extracted)">{{ q }}</span>
                  </div>
                  <ng-template #noQualities>
                    <div class="text-muted">{{ i18n.t('candidateDetail.noQualities') }}</div>
                  </ng-template>
                </div>

                <div class="info-group">
                  <div class="info-label">{{ i18n.t('candidateDetail.interests') }}</div>
                  <div class="chip-wrap" *ngIf="getInterests(extracted).length; else noInterests">
                    <span class="chip chip-soft" *ngFor="let interest of getInterests(extracted)">{{ interest }}</span>
                  </div>
                  <ng-template #noInterests>
                    <div class="text-muted">{{ i18n.t('candidateDetail.noInterests') }}</div>
                  </ng-template>
                </div>
              </section>
            </div>
          </ng-container>
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    @use 'sass:color';
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

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
      font-family: 'Manrope', 'Segoe UI', sans-serif;
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
    .badge-processed   { background: rgba($warning, 0.12); color: color.adjust($warning, $lightness: -5%); }
    .badge-reviewing   { background: rgba(#8b5cf6, 0.12); color: #6d28d9; }
    .badge-shortlisted { background: rgba($success, 0.14); color: $success; }
    .badge-rejected    { background: rgba($error, 0.12); color: $error; }
    .badge-hired       { background: rgba($success, 0.2);  color: color.adjust($success, $lightness: -10%); }
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

    .card-location .location-card-body {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .card-location {
      grid-column: 1 / -1;
    }

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
      min-width: 160px;
      margin-right: 8px;
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
    /* SPRINT 3: CV Template Override */
    /* ══════════════════════════════════════════════════════════════════ */

    .template-override-section {
      background: #fff;
      border-radius: 20px;
      border: 1px solid $gray-200;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      padding: 24px;
      margin-top: 24px;
    }

    .template-override-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      background: $gray-50;
      border: 1px solid $gray-200;
      border-radius: 16px;
      padding: 16px 18px;
    }

    .template-override-title {
      font-size: 14px;
      font-weight: 700;
      color: $gray-800;
      margin-bottom: 6px;
    }

    .template-override-sub {
      font-size: 12px;
      color: $gray-600;
    }

    .template-override-control {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 220px;
    }

    .template-select {
      width: 100%;
    }

    .template-override-note {
      font-size: 11px;
      font-weight: 600;
      color: $gray-400;
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
    /* SPRINT 3: Parsed CV Details */
    /* ══════════════════════════════════════════════════════════════════ */

    .parsed-cv-section {
      background: #fff;
      border-radius: 20px;
      border: 1px solid $gray-200;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      padding: 24px;
      margin-top: 24px;
    }

    .section-subtitle {
      margin: -8px 0 18px;
      color: $gray-600;
      font-size: 13px;
    }

    .parsed-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    @media (max-width: 900px) {
      .parsed-grid {
        grid-template-columns: 1fr;
      }
      .span-2 {
        grid-column: auto;
      }
    }

    .span-2 {
      grid-column: span 2;
    }

    .parsed-card {
      background: $gray-50;
      border-radius: 16px;
      padding: 18px;
      border: 1px solid $gray-200;
    }

    .parsed-card-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: $gray-600;
      margin-bottom: 12px;
    }

    .kv-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .kv-item {
      background: #fff;
      border-radius: 12px;
      padding: 12px;
      border: 1px solid $gray-200;
    }

    .kv-item-full {
      grid-column: 1 / -1;
    }

    .kv-label {
      font-size: 11px;
      color: $gray-400;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 6px;
    }

    .kv-value {
      font-size: 13px;
      font-weight: 600;
      color: $gray-800;
    }

    .location-value {
      margin-top: 8px;
    }

    .kv-link {
      color: $red;
      text-decoration: none;
    }

    .kv-link:hover {
      text-decoration: underline;
    }

    .parsed-text {
      font-size: 13px;
      color: $gray-700;
      line-height: 1.6;
      margin: 0;
    }

    .text-muted {
      color: $gray-400;
      font-size: 13px;
    }

    .link-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .link-pill {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 10px 12px;
      border-radius: 12px;
      background: #fff;
      border: 1px solid $gray-200;
      text-decoration: none;
    }

    .link-label {
      font-size: 11px;
      font-weight: 700;
      color: $gray-600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .link-url {
      font-size: 13px;
      color: $red;
      word-break: break-all;
    }

    .chip-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip {
      padding: 6px 12px;
      background: rgba($red, 0.1);
      color: $red-deep;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }

    .chip-soft {
      background: rgba($gray-600, 0.12);
      color: $gray-700;
      font-weight: 600;
    }

    .chip-subtitle {
      margin: 12px 0 8px;
      font-size: 12px;
      font-weight: 700;
      color: $gray-600;
    }

    .score-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .score-pill {
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      background: rgba($gray-600, 0.12);
      color: $gray-700;
    }

    .score-excellent { background: rgba(22, 163, 74, 0.15); color: #15803d; }
    .score-good { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; }
    .score-fair { background: rgba(245, 158, 11, 0.15); color: #b45309; }
    .score-poor { background: rgba(239, 68, 68, 0.12); color: #b91c1c; }

    .score-formula {
      margin: 0 0 16px;
      font-size: 13px;
      color: $gray-600;
    }

    .score-bars {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .score-row {
      display: grid;
      grid-template-columns: 110px 1fr 36px;
      align-items: center;
      gap: 12px;
      font-size: 12px;
    }

    .score-label {
      font-weight: 600;
      color: $gray-700;
    }

    .score-track {
      height: 10px;
      background: #fff;
      border-radius: 999px;
      border: 1px solid $gray-200;
      overflow: hidden;
    }

    .score-fill {
      height: 100%;
      background: linear-gradient(135deg, $red, $red-deep);
      border-radius: 999px;
    }

    .score-fill-alt {
      background: linear-gradient(135deg, #1d4ed8, #60a5fa);
    }

    .score-fill-soft {
      background: linear-gradient(135deg, #16a34a, #4ade80);
    }

    .score-value {
      font-weight: 700;
      color: $gray-800;
      text-align: right;
    }

    .score-details {
      margin-top: 16px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }

    .score-rationale {
      margin-top: 16px;
      background: #fff;
      border: 1px solid $gray-200;
      border-radius: 14px;
      padding: 12px;
    }

    .rationale-list {
      margin: 0 0 10px;
      padding-left: 18px;
      color: $gray-700;
      font-size: 12px;
      line-height: 1.6;
    }

    .rationale-missing {
      margin-top: 10px;
    }

    .score-block {
      background: #fff;
      border: 1px solid $gray-200;
      border-radius: 14px;
      padding: 12px;
    }

    .score-subtitle {
      font-size: 12px;
      font-weight: 700;
      color: $gray-600;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .chip-positive {
      background: rgba(22, 163, 74, 0.15);
      color: #166534;
    }

    .chip-negative {
      background: rgba(239, 68, 68, 0.12);
      color: #b91c1c;
    }

    .score-metric {
      font-size: 12px;
      color: $gray-700;
      margin-bottom: 6px;
    }

    .score-ok {
      color: #15803d;
      font-weight: 700;
    }

    .score-warn {
      color: #b91c1c;
      font-weight: 700;
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .timeline-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      background: #fff;
      border: 1px solid $gray-200;
      border-radius: 14px;
      padding: 12px;
    }

    .timeline-marker {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: rgba($red, 0.12);
      color: $red-deep;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 12px;
      flex-shrink: 0;
    }

    .timeline-body {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .timeline-title {
      font-size: 14px;
      font-weight: 700;
      color: $gray-800;
    }

    .timeline-sub {
      font-size: 12px;
      color: $gray-600;
    }

    .timeline-dot {
      margin: 0 6px;
      color: $gray-400;
    }

    .timeline-list {
      margin: 0;
      padding-left: 18px;
      color: $gray-700;
      font-size: 12px;
      line-height: 1.5;
    }

    .project-grid {
      display: grid;
      gap: 12px;
    }

    .project-card {
      background: #fff;
      border-radius: 14px;
      border: 1px solid $gray-200;
      padding: 12px;
    }

    .project-title {
      font-size: 13px;
      font-weight: 700;
      color: $gray-800;
      margin-bottom: 6px;
    }

    .project-desc {
      font-size: 12px;
      color: $gray-600;
      margin-bottom: 8px;
    }

    .project-links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .project-links a {
      font-size: 12px;
      color: $red;
      text-decoration: none;
    }

    .project-links a:hover {
      text-decoration: underline;
    }

    .info-group {
      margin-bottom: 14px;
    }

    .info-label {
      font-size: 12px;
      font-weight: 700;
      color: $gray-600;
      margin-bottom: 8px;
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
  statusDraft = '';

  // S2-US9: Notes edit state
  editingNotes = false;
  notesDraft = '';
  notesSaving = false;

  // S3: AI Pipeline state
  cvTemplates: CvTemplateMeta[] = [];
  defaultTemplateKey: CvTemplateKey = 'standard';
  selectedTemplateKey: CvTemplateKey = 'standard';
  cvPreview: CvPreviewResponse | null = null;
  sanitizedCvHtml: SafeHtml | null = null;
  cvZoom = 1;
  processingAction = false;
  showReprocessConfirm = false;
  candidateLocation = '';
  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    public candidateService: CandidateService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    public i18n: I18nService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = this.i18n.t('candidateDetail.error.invalidId');
      return;
    }
    this.downloadUrl = this.buildDownloadUrl(id);
    this.load(id);
    this.loadCvTemplates();
    this.loadDefaultCvTemplate();
  }

  load(id: string): void {
    this.loading = true;
    this.candidateService.getHrDetail(id).subscribe({
      next: (data) => {
        this.candidate = data;
        this.candidateLocation = this.buildCandidateLocation(data);
        this.loading = false;
        this.statusDraft = data.status;
        this.applyTemplateSelection();
        this.loadCvPreview(id);
        if (data.status === 'processing') {
          this.pollForCompletion();
        }
      },
      error: (err) => {
        this.error = err?.error?.error?.message || this.i18n.t('candidateDetail.error.loadFailed');
        this.loading = false;
      }
    });
  }

  // S3: Load CV templates
  loadCvTemplates(): void {
    this.candidateService.getCvTemplates().subscribe({
      next: (templates) => {
        this.cvTemplates = templates;
        this.applyTemplateSelection();
      },
      error: (err) => { console.error('Failed to load CV templates:', err); }
    });
  }

  loadDefaultCvTemplate(): void {
    this.candidateService.getDefaultCvTemplate().subscribe({
      next: (res) => {
        this.defaultTemplateKey = res.templateKey;
        this.applyTemplateSelection();
      },
      error: (err) => { console.error('Failed to load default CV template:', err); }
    });
  }

  applyTemplateSelection(): void {
    if (this.candidate?.cvTemplateKey) {
      this.selectedTemplateKey = this.candidate.cvTemplateKey;
      return;
    }
    this.selectedTemplateKey = this.defaultTemplateKey || 'standard';
  }

  // S3: Load CV preview
  loadCvPreview(id: string, templateKey?: CvTemplateKey): void {
    const key = templateKey || this.selectedTemplateKey;
    this.candidateService.getCvPreview(id, key).subscribe({
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
    if (!this.candidate) return;
    this.editingStatus = true;
    this.statusDraft = this.candidate.status;
  }

  /**
   * S2-US8: Save new status
   */
  saveStatus(): void {
    if (!this.candidate) return;
    const newStatus = this.statusDraft;
    if (!newStatus || newStatus === this.candidate.status) {
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
        this.statusDraft = res.status;
        this.statusSaving = false;
      },
      error: (err) => {
        this.error = err?.error?.error?.message || this.i18n.t('candidateDetail.error.statusUpdate');
        this.statusDraft = this.candidate?.status || '';
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
        this.error = err?.error?.error?.message || this.i18n.t('candidateDetail.error.notesUpdate');
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
    this.statusDraft = this.candidate?.status || '';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SPRINT 3: AI Pipeline Methods
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get human-readable status label
   */
  getStatusLabel(status: string): string {
    const key = `candidateDetail.statusDetail.${status}`;
    const label = this.i18n.t(key);
    return label === key ? this.getStatusShortLabel(status) : label;
  }

  getStatusShortLabel(status: string): string {
    const key = `candidateDetail.status.${status}`;
    const label = this.i18n.t(key);
    return label === key ? status : label;
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
        this.error = err?.error?.error?.message || this.i18n.t('candidateDetail.error.processStart');
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
        this.error = err?.error?.error?.message || this.i18n.t('candidateDetail.error.reprocess');
        this.processingAction = false;
      }
    });
  }

  /**
   * Poll for processing completion
   */
  pollForCompletion(): void {
    if (!this.candidate) return;

    if (this.pollHandle) return;

    const id = this.candidate.documentId;
    this.pollHandle = setInterval(() => {
      this.candidateService.getHrDetail(id).subscribe({
        next: (data) => {
          if (data.status !== 'processing') {
            if (this.pollHandle) clearInterval(this.pollHandle);
            if (this.pollTimeout) clearTimeout(this.pollTimeout);
            this.pollHandle = null;
            this.pollTimeout = null;
            this.candidate = data;
            this.candidateLocation = this.buildCandidateLocation(data);
            this.loadCvPreview(id);
          }
        },
        error: () => {
          if (this.pollHandle) clearInterval(this.pollHandle);
          if (this.pollTimeout) clearTimeout(this.pollTimeout);
          this.pollHandle = null;
          this.pollTimeout = null;
        }
      });
    }, 3000); // Poll every 3 seconds

    // Stop polling after 2 minutes
    this.pollTimeout = setTimeout(() => {
      if (this.pollHandle) clearInterval(this.pollHandle);
      this.pollHandle = null;
      this.pollTimeout = null;
    }, 120000);
  }

  /**
   * S3-US6: Select CV template
   */
  selectTemplate(key: CvTemplateKey): void {
    if (!this.candidate) return;

    const currentKey = this.candidate.cvTemplateKey || this.defaultTemplateKey || 'standard';
    if (key === currentKey) {
      this.selectedTemplateKey = key;
      return;
    }

    this.selectedTemplateKey = key;
    this.candidateService.updateCvTemplate(this.candidate.documentId, key).subscribe({
      next: (res) => {
        if (this.candidate) {
          this.candidate.cvTemplateKey = res.cvTemplateKey as CvTemplateKey;
        }
        if (this.candidate) {
          this.loadCvPreview(this.candidate.documentId, key);
        }
      },
      error: (err) => {
        this.error = err?.error?.error?.message || this.i18n.t('candidateDetail.error.templateUpdate');
        this.applyTemplateSelection();
      }
    });
  }

  getTemplateName(key: CvTemplateKey): string {
    const match = this.cvTemplates.find(t => t.key === key);
    return match ? match.name : key;
  }

  private buildCandidateLocation(candidate?: CandidateDetail | null): string {
    const city = candidate?.city?.trim() || '';
    const country = candidate?.country?.trim() || '';
    if (city && country) return `${city}, ${country}`;
    return city || country;
  }

  getExtractedContact(extracted: any): {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    portfolio: string;
    links: string[];
  } {
    const contact = extracted?.contact ?? {};
    const fullName = this.pickFirstText(contact?.fullName, this.candidate?.fullName) ?? '-';
    const email = this.pickFirstText(contact?.email, this.candidate?.email) ?? '-';
    const phone = this.pickFirstText(contact?.phone) ?? '-';
    const location = this.pickFirstText(contact?.location) ?? '-';
    const linkedin = this.pickFirstText(contact?.linkedin, this.candidate?.linkedin) ?? '-';
    const portfolio = this.pickFirstText(contact?.portfolio, this.candidate?.portfolio) ?? '-';
    const links = this.uniqStrings(this.toTrimmedArray(contact?.links));

    return { fullName, email, phone, location, linkedin, portfolio, links };
  }

  getSummaryText(extracted: any): string {
    const summary = extracted?.summary;
    if (typeof summary === 'string' && summary.trim()) return summary.trim();
    return this.i18n.t('candidateDetail.noSummary');
  }

  getSkills(extracted: any): string[] {
    return this.uniqStrings(this.toTrimmedArray(extracted?.skills));
  }

  getCompetencies(extracted: any): string[] {
    return this.uniqStrings(this.toTrimmedArray(extracted?.competencies));
  }

  getExperienceItems(extracted: any): Array<{ title: string; company: string; startDate?: string; endDate?: string; highlights?: string[] }> {
    const rows = Array.isArray(extracted?.experience) ? extracted.experience : [];
    return rows
      .map((row: any) => {
        const title = this.pickFirstText(row?.title) ?? '';
        const company = this.pickFirstText(row?.company) ?? '';
        const startDate = this.pickFirstText(row?.startDate) ?? '';
        const endDate = this.pickFirstText(row?.endDate) ?? '';
        const highlights = this.toTrimmedArray(row?.highlights);
        return { title, company, startDate, endDate, highlights };
      })
      .filter((row: { title: string; company: string; startDate: string; endDate: string; highlights: string[] }) =>
        row.title || row.company || row.startDate || row.endDate || row.highlights.length > 0
      );
  }

  getEducationItems(extracted: any): Array<{ degree: string; school: string; startDate?: string; endDate?: string }> {
    const rows = Array.isArray(extracted?.education) ? extracted.education : [];
    return rows
      .map((row: any) => {
        const degree = this.pickFirstText(row?.degree) ?? '';
        const school = this.pickFirstText(row?.school) ?? '';
        const startDate = this.pickFirstText(row?.startDate) ?? '';
        const endDate = this.pickFirstText(row?.endDate) ?? '';
        return { degree, school, startDate, endDate };
      })
      .filter((row: { degree: string; school: string; startDate: string; endDate: string }) =>
        row.degree || row.school || row.startDate || row.endDate
      );
  }

  getProjects(extracted: any): Array<{ name: string; description: string; links: string[] }> {
    const rows = Array.isArray(extracted?.projects) ? extracted.projects : [];
    return rows
      .map((row: any) => {
        const name = this.pickFirstText(row?.name) ?? '';
        const description = this.pickFirstText(row?.description) ?? '';
        const links = this.uniqStrings(this.toTrimmedArray(row?.links));
        return { name, description, links };
      })
      .filter((row: { name: string; description: string; links: string[] }) =>
        row.name || row.description || row.links.length > 0
      );
  }

  getCertifications(extracted: any): string[] {
    return this.uniqStrings(this.toTrimmedArray(extracted?.certifications));
  }

  getLanguages(extracted: any): string[] {
    return this.uniqStrings(this.toTrimmedArray(extracted?.languages));
  }

  getQualities(extracted: any): string[] {
    return this.uniqStrings(this.toTrimmedArray(extracted?.qualities));
  }

  getInterests(extracted: any): string[] {
    return this.uniqStrings(this.toTrimmedArray(extracted?.interests));
  }

  getScoreExplanation(extracted: any): {
    score: number;
    fitScore: number;
    completenessScore: number;
    skillsMatched: string[];
    skillsMissing: string[];
    niceToHaveMatched: string[];
    experienceYears: number;
    experienceMatch: boolean | null;
    qualityLabel: string;
    qualityTone: string;
  } | null {
    const evaluation = extracted?.evaluation;
    if (!evaluation || typeof evaluation !== 'object') return null;

    const breakdown = evaluation?.breakdown ?? {};
    const score = this.toScore(evaluation?.score ?? breakdown?.score ?? 0);
    const fitScore = this.toScore(breakdown?.fitScore ?? evaluation?.fitScore ?? 0);
    const completenessScore = this.toScore(breakdown?.completenessScore ?? evaluation?.completenessScore ?? 0);

    const skillsMatched = this.uniqStrings(this.toTrimmedArray(
      breakdown?.skillsMatched ?? evaluation?.skillsMatched ?? evaluation?.matchedSkills
    ));
    const skillsMissing = this.uniqStrings(this.toTrimmedArray(
      breakdown?.skillsMissing ?? evaluation?.skillsMissing ?? evaluation?.missingSkills
    ));
    const niceToHaveMatched = this.uniqStrings(this.toTrimmedArray(
      breakdown?.niceToHaveMatched ?? evaluation?.niceToHaveMatched ?? evaluation?.matchedNiceToHave
    ));

    const experienceYears = this.toNumber(breakdown?.experienceYears ?? evaluation?.experienceYears) ?? 0;
    const experienceMatch = typeof breakdown?.experienceMatch === 'boolean'
      ? breakdown.experienceMatch
      : typeof evaluation?.experienceMatch === 'boolean'
        ? evaluation.experienceMatch
        : null;

    const qualityRaw = typeof evaluation?.qualityLabel === 'string'
      ? evaluation.qualityLabel.trim().toLowerCase()
      : '';
    const qualityTone = ['excellent', 'good', 'fair', 'poor'].includes(qualityRaw) ? qualityRaw : 'neutral';
    const qualityKey = qualityRaw ? `candidateDetail.quality.${qualityRaw}` : 'candidateDetail.scoreLabel';
    const localized = this.i18n.t(qualityKey);
    const qualityLabel = localized === qualityKey
      ? (qualityRaw ? qualityRaw.charAt(0).toUpperCase() + qualityRaw.slice(1) : 'Score')
      : localized;

    return {
      score,
      fitScore,
      completenessScore,
      skillsMatched,
      skillsMissing,
      niceToHaveMatched,
      experienceYears,
      experienceMatch,
      qualityLabel,
      qualityTone,
    };
  }

  getScoreRationale(extracted: any): {
    requiredMatched: number;
    requiredTotal: number;
    niceToHaveMatched: number;
    experienceYears: number | null;
    experienceLabel: string;
    completenessScore: number;
    missingFields: string[];
  } | null {
    const evaluation = extracted?.evaluation;
    if (!evaluation || typeof evaluation !== 'object') return null;

    const breakdown = evaluation?.breakdown ?? {};
    const skillsMatched = this.uniqStrings(this.toTrimmedArray(
      breakdown?.skillsMatched ?? evaluation?.skillsMatched ?? evaluation?.matchedSkills
    ));
    const skillsMissing = this.uniqStrings(this.toTrimmedArray(
      breakdown?.skillsMissing ?? evaluation?.skillsMissing ?? evaluation?.missingSkills
    ));
    const niceToHaveMatched = this.uniqStrings(this.toTrimmedArray(
      breakdown?.niceToHaveMatched ?? evaluation?.niceToHaveMatched ?? evaluation?.matchedNiceToHave
    ));

    const requiredMatched = skillsMatched.length;
    const requiredTotal = requiredMatched + skillsMissing.length;

    const experienceYears = this.toNumber(breakdown?.experienceYears ?? evaluation?.experienceYears);
    const experienceMatch = typeof breakdown?.experienceMatch === 'boolean'
      ? breakdown.experienceMatch
      : typeof evaluation?.experienceMatch === 'boolean'
        ? evaluation.experienceMatch
        : null;
    const experienceLabel = experienceMatch === null
      ? this.i18n.t('candidateDetail.requirementNotSpecified')
      : experienceMatch
        ? this.i18n.t('candidateDetail.requirementMet')
        : this.i18n.t('candidateDetail.requirementNotMet');

    const completenessScore = this.toScore(breakdown?.completenessScore ?? evaluation?.completenessScore ?? 0);
    const missingFields = this.getCompletenessMissing(extracted);

    return {
      requiredMatched,
      requiredTotal,
      niceToHaveMatched: niceToHaveMatched.length,
      experienceYears,
      experienceLabel,
      completenessScore,
      missingFields,
    };
  }

  private getCompletenessMissing(extracted: any): string[] {
    const missing: string[] = [];
    const contact = extracted?.contact ?? {};

    if (!this.pickFirstText(contact?.fullName)) missing.push(this.i18n.t('candidateDetail.missing.fullName'));
    if (!this.pickFirstText(contact?.email)) missing.push(this.i18n.t('candidateDetail.missing.email'));
    if (!this.pickFirstText(contact?.phone)) missing.push(this.i18n.t('candidateDetail.missing.phone'));
    if (!this.pickFirstText(contact?.location)) missing.push(this.i18n.t('candidateDetail.missing.location'));

    if (!this.pickFirstText(contact?.linkedin, this.candidate?.linkedin)) missing.push(this.i18n.t('candidateDetail.missing.linkedin'));
    if (!this.pickFirstText(contact?.portfolio, this.candidate?.portfolio)) missing.push(this.i18n.t('candidateDetail.missing.portfolio'));

    if (!this.pickFirstText(extracted?.summary)) missing.push(this.i18n.t('candidateDetail.missing.summary'));
    if (this.toTrimmedArray(extracted?.skills).length === 0) missing.push(this.i18n.t('candidateDetail.missing.skills'));

    const experience = Array.isArray(extracted?.experience) ? extracted.experience : [];
    if (experience.length === 0) missing.push(this.i18n.t('candidateDetail.missing.experience'));
    const hasDatedExperience = experience.some((row: any) =>
      this.pickFirstText(row?.startDate) && this.pickFirstText(row?.endDate)
    );
    if (!hasDatedExperience) missing.push(this.i18n.t('candidateDetail.missing.experienceDates'));

    const education = Array.isArray(extracted?.education) ? extracted.education : [];
    if (education.length === 0) missing.push(this.i18n.t('candidateDetail.missing.education'));

    const projects = Array.isArray(extracted?.projects) ? extracted.projects : [];
    if (projects.length === 0) missing.push(this.i18n.t('candidateDetail.missing.projects'));

    return missing;
  }

  getContactLinks(extracted: any): Array<{ label: string; url: string; display: string }> {
    const contact = this.getExtractedContact(extracted);
    const links: Array<{ label: string; url: string; display: string }> = [];
    const seen = new Set<string>();

    const pushLink = (label: string, value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      const normalized = this.normalizeUrl(trimmed);
      const key = normalized.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      links.push({ label, url: normalized, display: trimmed });
    };

    if (contact.linkedin !== '-') pushLink(this.i18n.t('candidateDetail.link.linkedin'), contact.linkedin);
    if (contact.portfolio !== '-') pushLink(this.i18n.t('candidateDetail.link.portfolio'), contact.portfolio);

    for (const link of contact.links) {
      pushLink(this.i18n.t('candidateDetail.link.generic'), link);
    }

    return links;
  }

  formatDateRange(start?: string, end?: string): string {
    const startText = typeof start === 'string' && start.trim() ? start.trim() : '';
    const endText = typeof end === 'string' && end.trim() ? end.trim() : '';
    if (startText && endText) return `${startText} - ${endText}`;
    if (startText && !endText) return `${startText} - ${this.i18n.t('candidateDetail.present')}`;
    if (!startText && endText) return endText;
    return this.i18n.t('candidateDetail.datesNotProvided');
  }

  normalizeUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  private toNumber(value: unknown): number | null {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  private toScore(value: unknown): number {
    const n = this.toNumber(value) ?? 0;
    return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
  }

  private pickFirstText(...values: unknown[]): string | null {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  }

  private toTrimmedArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  private uniqStrings(items: string[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const raw of items) {
      const value = raw.trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(value);
    }
    return out;
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
