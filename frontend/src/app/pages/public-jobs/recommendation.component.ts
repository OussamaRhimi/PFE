import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CandidateService } from '../../services/candidate.service';
import { I18nService } from '../../services/i18n.service';
import { PublicNavbarComponent } from '../../components/public-navbar/public-navbar.component';
import { PublicFooterComponent } from '../../components/public-footer/public-footer.component';

interface RecommendationJob {
  id: number;
  title: string | null;
  description: string | null;
  requirements: any | null;
  compatibility: number;
  matchedRequired: string[];
  missingRequired: string[];
  matchedNiceToHave: string[];
  missingNiceToHave: string[];
}

interface RecommendationResponse {
  skills: string[];
  totalConsidered: number;
  top: RecommendationJob[];
  message: string | null;
}

@Component({
  selector: 'app-recommendation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PublicNavbarComponent, PublicFooterComponent],
  template: `
    <app-public-navbar />

    <main class="recommend-page">
      <div class="hero">
        <h1>{{ i18n.t('recommend.title') }}</h1>
        <p>{{ i18n.t('recommend.subtitle') }}</p>
      </div>

      <div class="card">
        <div class="alert error" *ngIf="error">{{ error }}<button (click)="error=''">&times;</button></div>

        <div class="upload">
          <label class="label">{{ i18n.t('recommend.uploadLabel') }}</label>
          <input type="file" (change)="onFileSelect($event)" accept=".pdf,.docx,.txt,application/pdf" />
          <div class="file-meta" *ngIf="selectedFile">
            <span>{{ selectedFile.name }}</span>
            <span>{{ (selectedFile.size / 1024 / 1024).toFixed(1) }} MB</span>
            <button class="btn-ghost" type="button" (click)="clearFile()">{{ i18n.t('recommend.remove') }}</button>
          </div>
        </div>

        <div class="actions">
          <button class="btn-primary" type="button" (click)="recommend()" [disabled]="loading || !selectedFile">
            {{ loading ? i18n.t('recommend.loading') : i18n.t('recommend.cta') }}
          </button>
          <a routerLink="/jobs" class="btn-secondary">{{ i18n.t('recommend.browseJobs') }}</a>
        </div>

        <div class="skills" *ngIf="result?.skills?.length">
          <div class="label">{{ i18n.t('recommend.detected') }}</div>
          <div class="chip-wrap">
            <span class="chip" *ngFor="let skill of result?.skills">{{ skill }}</span>
          </div>
        </div>
      </div>

      <section class="results" *ngIf="result">
        <h2>{{ i18n.t('recommend.topMatches') }}</h2>
        <div class="alert" *ngIf="!result.top.length">{{ result.message || i18n.t('recommend.noMatches') }}</div>

        <article class="match" *ngFor="let job of result.top; let i = index">
          <div class="match-head">
            <div>
              <div class="rank">#{{ i + 1 }}</div>
              <h3>{{ job.title || (i18n.t('recommend.job') + ' #' + job.id) }}</h3>
            </div>
            <div class="score">{{ job.compatibility | number:'1.0-0' }}%</div>
          </div>
          <div class="meter"><span [style.width.%]="job.compatibility"></span></div>
          <div class="small" *ngIf="job.matchedRequired.length">
            {{ i18n.t('recommend.matched') }}: {{ job.matchedRequired.join(', ') }}
          </div>
          <div class="small muted" *ngIf="job.missingRequired.length">
            {{ i18n.t('recommend.missing') }}: {{ job.missingRequired.join(', ') }}
          </div>
        </article>
      </section>
    </main>

    <app-public-footer />
  `,
  styles: [
    `
      $logo-red: #8b1f1f;
      $logo-red-deep: #791212;
      $gray-50: #f9fafb;
      $gray-100: #f1f3f7;
      $gray-200: #e5e8ef;
      $gray-400: #9aa0b4;
      $gray-700: #3d4358;
      $gray-800: #252b3b;

      .recommend-page {
        max-width: 980px;
        margin: 32px auto;
        padding: 0 24px 48px;
      }
      .hero {
        margin-bottom: 20px;
      }
      .hero h1 {
        margin: 0 0 6px;
        font-size: 1.8rem;
        font-weight: 800;
        color: $gray-800;
      }
      .hero p { color: $gray-400; margin: 0; }

      .card {
        background: #fff;
        border: 1px solid $gray-200;
        border-radius: 18px;
        padding: 20px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        margin-bottom: 24px;
      }

      .alert {
        background: $gray-50;
        border: 1px solid $gray-200;
        padding: 12px 14px;
        border-radius: 10px;
        font-size: 13px;
      }
      .alert.error { background: #fff5f5; border-color: #fbd5d5; color: #b91c1c; }
      .alert button { background: none; border: none; margin-left: 8px; }

      .upload { display: grid; gap: 8px; }
      .label { font-size: 12px; font-weight: 700; color: $gray-700; text-transform: uppercase; }
      .file-meta { display: flex; gap: 12px; align-items: center; font-size: 12px; color: $gray-400; }
      .btn-ghost {
        border: 1px solid $gray-200;
        background: #fff;
        padding: 4px 10px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
        color: $gray-700;
      }

      .actions { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
      .btn-primary {
        padding: 10px 18px;
        border: none;
        border-radius: 10px;
        background: linear-gradient(135deg, $logo-red-deep, $logo-red);
        color: #fff;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-secondary {
        padding: 10px 18px;
        border-radius: 10px;
        background: $gray-100;
        color: $gray-700;
        text-decoration: none;
        font-weight: 600;
      }

      .skills { margin-top: 18px; }
      .chip-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
      .chip { background: rgba($logo-red, 0.08); color: $logo-red-deep; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }

      .results h2 { margin-bottom: 12px; color: $gray-800; }
      .match {
        background: #fff;
        border: 1px solid $gray-200;
        border-radius: 14px;
        padding: 16px;
        margin-bottom: 12px;
      }
      .match-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      .rank { font-size: 12px; color: $gray-400; font-weight: 700; }
      .score { font-size: 16px; font-weight: 700; color: $logo-red-deep; }
      .meter { height: 6px; background: $gray-100; border-radius: 999px; overflow: hidden; margin: 8px 0 10px; }
      .meter span { display: block; height: 100%; background: linear-gradient(90deg, $logo-red-deep, $logo-red); }
      .small { font-size: 12px; color: $gray-700; }
      .muted { color: $gray-400; }
    `,
  ],
})
export class RecommendationComponent {
  loading = false;
  error = '';
  selectedFile: File | null = null;
  result: RecommendationResponse | null = null;

  constructor(private candidateService: CandidateService, public i18n: I18nService) {}

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  clearFile(): void {
    this.selectedFile = null;
  }

  recommend(): void {
    if (!this.selectedFile || this.loading) return;
    this.loading = true;
    this.error = '';

    this.candidateService.recommendJobPostings(this.selectedFile).subscribe({
      next: (res: RecommendationResponse) => {
        this.result = res;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || this.i18n.t('recommend.error');
        this.loading = false;
      },
    });
  }
}
