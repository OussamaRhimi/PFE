import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

/* ── Response shapes ── */
export interface ApplyResponse {
  publicToken: string;
  fullName: string;
  email: string;
  status: string;
  createdAt: string;
}

export interface TrackResponse {
  fullName: string;
  email: string;
  status: string;
  score: number;
  jobTitle: string | null;
  createdAt: string;
  updatedAt: string;
  retentionUntil: string;
}

export interface TrackingApplication {
  publicToken: string;
  status: string;
  jobTitle: string | null;
  createdAt: string;
  updatedAt: string;
  retentionUntil: string;
}

export interface VerifyTrackingCodeResponse {
  email: string;
  applications: TrackingApplication[];
}

export interface WithdrawResponse {
  message: string;
}

/* ── S2-US7: HR Candidate detail shape ── */
export interface CandidateResume {
  id: number;
  name: string;
  url: string;
  mime: string;
  size: number;
}

export interface CandidateDetail {
  documentId: string;
  fullName: string;
  email: string;
  linkedin: string | null;
  portfolio: string | null;
  selfReportedYearsExperience: number | null;
  status: string;
  score: number;
  hrNotes: string | null;
  candidateNotes: string | null;
  consent: boolean;
  consentAt: string | null;
  retentionUntil: string | null;
  jobTitle: string | null;
  jobPostingId: string | null;
  resume: CandidateResume | null;
  createdAt: string;
  updatedAt: string;
}

/* ── HR candidate list item (from Strapi core find) ── */
export interface CandidateListItem {
  documentId: string;
  fullName: string;
  email: string;
  status: string;
  score: number;
  createdAt: string;
  jobPosting?: { documentId: string; title: string } | null;
}

/* ── Payload for the application form ── */
export interface ApplyPayload {
  fullName: string;
  email: string;
  linkedin?: string;
  portfolio?: string;
  candidateNotes?: string;
  selfReportedYearsExperience?: number;
  jobPostingId: string;
  consent: boolean;
  resume: File;
}

@Injectable({ providedIn: 'root' })
export class CandidateService {
  private readonly apiUrl = 'http://localhost:1337/api/candidates';

  constructor(private http: HttpClient) { }

  /**
   * Submit a job application (multipart/form-data).
   */
  apply(payload: ApplyPayload): Observable<ApplyResponse> {
    const fd = new FormData();
    fd.append('fullName', payload.fullName.trim());
    fd.append('email', payload.email.trim());
    if (payload.linkedin) fd.append('linkedin', payload.linkedin.trim());
    if (payload.portfolio) fd.append('portfolio', payload.portfolio.trim());
    if (payload.candidateNotes) fd.append('candidateNotes', payload.candidateNotes.trim());
    if (payload.selfReportedYearsExperience != null) {
      fd.append('selfReportedYearsExperience', String(payload.selfReportedYearsExperience));
    }
    fd.append('jobPostingId', payload.jobPostingId);
    fd.append('consent', String(payload.consent));
    fd.append('resume', payload.resume, payload.resume.name);

    return this.http.post<{ data: ApplyResponse }>(`${this.apiUrl}/apply`, fd).pipe(
      map(res => res.data)
    );
  }

  /**
   * Track application status by token.
   */
  track(token: string): Observable<TrackResponse> {
    return this.http.get<{ data: TrackResponse }>(`${this.apiUrl}/track/${token}`).pipe(
      map(res => res.data)
    );
  }

  /**
   * US4: Request verification code by email.
   */
  requestTrackingCode(email: string): Observable<{ message: string }> {
    return this.http
      .post<{ data: { message: string } }>(`${this.apiUrl}/track/request-code`, { email })
      .pipe(map(res => res.data));
  }

  /**
   * US4: Verify email code and get all applications attached to the email.
   */
  verifyTrackingCode(email: string, code: string): Observable<VerifyTrackingCodeResponse> {
    return this.http
      .post<{ data: VerifyTrackingCodeResponse }>(`${this.apiUrl}/track/verify-code`, { email, code })
      .pipe(map(res => res.data));
  }

  /**
   * GDPR self-service: withdraw application and delete all data.
   */
  withdraw(token: string): Observable<WithdrawResponse> {
    return this.http.delete<{ data: WithdrawResponse }>(`${this.apiUrl}/withdraw/${token}`).pipe(
      map(res => res.data)
    );
  }

  /* ── S2-US7: HR endpoints ── */

  /**
   * HR: Get paginated list of all candidates (requires JWT via interceptor).
   */
  getAllHr(page = 1, pageSize = 20): Observable<CandidateListItem[]> {
    return this.http
      .get<{ data: any[] }>(
        `${this.apiUrl}?populate=jobPosting&sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}`
      )
      .pipe(
        map(res =>
          res.data.map(item => ({
            documentId: item.documentId,
            fullName: item.fullName,
            email: item.email,
            status: item.status,
            score: item.score ?? 0,
            createdAt: item.createdAt,
            jobPosting: item.jobPosting
              ? { documentId: item.jobPosting.documentId, title: item.jobPosting.title }
              : null,
          }))
        )
      );
  }

  /**
   * US7: Get full candidate detail for HR view (requires JWT via interceptor).
   */
  getHrDetail(id: string): Observable<CandidateDetail> {
    return this.http
      .get<{ data: CandidateDetail }>(`${this.apiUrl}/hr/${id}`)
      .pipe(map(res => res.data));
  }

  /**
   * US7: Open resume download URL in a new tab (browser handles the download).
   * The server returns Content-Disposition: attachment so it triggers a save dialog.
   */
  getResumeDownloadUrl(id: string): string {
    return `${this.apiUrl}/hr/${id}/resume`;
  }
}

