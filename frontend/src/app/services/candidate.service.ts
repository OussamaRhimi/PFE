import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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


getCandidatesByJob(
    jobId: string, 
    page: number = 1, 
    sort: string = 'name:asc'
  ): Observable<any> {
    const params = new HttpParams()
      .set('filters[job_posting][documentId][$eq]', jobId)
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', '10')
      .set('sort', sort)
      .set('populate', '*'); // Pour récupérer les relations si besoin

    return this.http.get(this.apiUrl, { params });
  }
}
