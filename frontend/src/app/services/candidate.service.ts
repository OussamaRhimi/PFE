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

export interface StrapiResponse {
  data: any[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    }
  }
}

export interface TrackResponse {
  documentId: string;
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
  documentId: string;
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
  // Sprint 3 fields
  extractedData?: ExtractedData;
  standardizedCvMarkdown?: string;
  cvTemplateKey?: CvTemplateKey;
}

/* ── HR candidate list item (from dedicated HR endpoint) ── */
export interface CandidateListItem {
  documentId: string;
  fullName: string;
  email: string;
  status: string;
  score: number;
  createdAt: string;
  updatedAt?: string;
  jobTitle?: string | null;
  jobPostingId?: string | null;
  jobPosting?: { documentId: string; title: string } | null;
}

/* ── HR list response with pagination ── */
export interface HrListResponse {
  data: CandidateListItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

/* ── Status update response ── */
export interface StatusUpdateResponse {
  documentId: string;
  status: string;
  previousStatus: string;
  updatedAt: string;
}

/* ── HR notes update response ── */
export interface HrNotesUpdateResponse {
  documentId: string;
  hrNotes: string | null;
  updatedAt: string;
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

  /* ── S2-US6/US7: HR endpoints ── */

  /**
   * US6: HR candidate listing with pagination, filtering, and sorting.
   */
  getAllHr(
    page = 1,
    pageSize = 25,
    sort = 'createdAt:desc',
    filters?: { status?: string; jobPostingId?: string; search?: string }
  ): Observable<HrListResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize))
      .set('sort', sort);

    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.jobPostingId) {
      params = params.set('jobPostingId', filters.jobPostingId);
    }
    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    return this.http.get<HrListResponse>(`${this.apiUrl}/hr`, { params });
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

  /**
   * S2-US8: Update candidate status with transition validation.
   */
  updateStatus(id: string, status: string): Observable<StatusUpdateResponse> {
    return this.http
      .put<{ data: StatusUpdateResponse }>(`${this.apiUrl}/hr/${id}/status`, { status })
      .pipe(map(res => res.data));
  }

  /**
   * S2-US9: Update HR notes for a candidate.
   */
  updateHrNotes(id: string, hrNotes: string): Observable<HrNotesUpdateResponse> {
    return this.http
      .put<{ data: HrNotesUpdateResponse }>(`${this.apiUrl}/hr/${id}/notes`, { hrNotes })
      .pipe(map(res => res.data));
  }

  // Compatibility methods used by legacy pages added during merge.
  getCandidatesByJob(jobId: string, page = 1, sort = 'fullName:asc'): Observable<StrapiResponse> {
    const params = new HttpParams()
      .set('filters[job_posting][documentId][$eq]', jobId)
      .set('pagination[page]', String(page))
      .set('pagination[pageSize]', '10')
      .set('sort', sort)
      .set('populate', '*');

    return this.http.get<StrapiResponse>(`${this.apiUrl}`, { params });
  }

  getCandidateById(documentId: string): Observable<{ data: CandidateDetail }> {
    return this.getHrDetail(documentId).pipe(map(data => ({ data })));
  }

  changeStatus(documentId: string, newStatus: string): Observable<StatusUpdateResponse> {
    return this.updateStatus(documentId, newStatus);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SPRINT 3: AI Pipeline & CV Features
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * S3-US6: Get list of available CV templates
   */
  getCvTemplates(): Observable<CvTemplateMeta[]> {
    return this.http
      .get<{ data: CvTemplateMeta[] }>('http://localhost:1337/api/cv-templates')
      .pipe(map(res => res.data));
  }

  /**
   * S3-US6: Get rendered preview HTML for a CV template
   */
  getCvTemplatePreview(templateKey: CvTemplateKey): Observable<CvTemplatePreviewResponse> {
    const params = new HttpParams().set('templateKey', templateKey);
    return this.http
      .get<{ data: CvTemplatePreviewResponse }>('http://localhost:1337/api/cv-templates/preview', { params })
      .pipe(map(res => res.data));
  }

  /**
   * S3-US6: Get the persisted default CV template key
   */
  getDefaultCvTemplate(): Observable<{ templateKey: CvTemplateKey }> {
    return this.http
      .get<{ data: { templateKey: CvTemplateKey } }>('http://localhost:1337/api/cv-templates/default')
      .pipe(map(res => res.data));
  }

  /**
   * S3-US6: Set the persisted default CV template key
   */
  setDefaultCvTemplate(templateKey: CvTemplateKey): Observable<{ templateKey: CvTemplateKey }> {
    return this.http
      .put<{ data: { templateKey: CvTemplateKey } }>('http://localhost:1337/api/cv-templates/default', { templateKey })
      .pipe(map(res => res.data));
  }

  /**
   * S3-US6: Update candidate's CV template selection
   */
  updateCvTemplate(id: string, templateKey: CvTemplateKey): Observable<{ documentId: string; cvTemplateKey: string; updatedAt: string }> {
    return this.http
      .put<{ data: { documentId: string; cvTemplateKey: string; updatedAt: string } }>(
        `${this.apiUrl}/${id}/template`,
        { templateKey }
      )
      .pipe(map(res => res.data));
  }

  /**
   * S3-US7: Get CV PDF download URL
   * @param id Candidate documentId
   * @param token Optional public token for candidate self-service access
   */
  getCvPdfDownloadUrl(id: string, token?: string): string {
    const base = `${this.apiUrl}/${id}/cv-pdf`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  }

  /**
   * S3-US5: Get CV preview data (HTML, markdown, extracted data)
   */
  getCvPreview(id: string, templateKey?: CvTemplateKey): Observable<CvPreviewResponse> {
    let params = new HttpParams();
    if (templateKey) {
      params = params.set('templateKey', templateKey);
    }
    return this.http
      .get<{ data: CvPreviewResponse }>(`${this.apiUrl}/${id}/cv-preview`, { params })
      .pipe(map(res => res.data));
  }

  /**
   * S3-US8: Reprocess candidate - reset and re-trigger AI pipeline
   */
  reprocess(id: string): Observable<{ success: boolean; message: string; documentId: string }> {
    return this.http
      .put<{ data: { success: boolean; message: string; documentId: string } }>(
        `${this.apiUrl}/${id}/reprocess`,
        {}
      )
      .pipe(map(res => res.data));
  }

  /**
   * S3-US1: Manually trigger AI processing for a candidate
   */
  triggerProcess(id: string): Observable<{ success: boolean; message: string; documentId: string; status: string }> {
    return this.http
      .post<{ data: { success: boolean; message: string; documentId: string; status: string } }>(
        `${this.apiUrl}/${id}/process`,
        {}
      )
      .pipe(map(res => res.data));
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SPRINT 3: Additional Types
// ══════════════════════════════════════════════════════════════════════════

/** CV Template keys - 11 templates */
export type CvTemplateKey =
  | 'standard'
  | 'experience_first'
  | 'skills_first'
  | 'compact'
  | 'education_first'
  | 'project_focus'
  | 'sidebar_photo'
  | 'accent_pink'
  | 'teal_circle'
  | 'navy_gold'
  | 'sunset';

/** CV Template metadata */
export interface CvTemplateMeta {
  key: CvTemplateKey;
  name: string;
  description: string;
}

/** CV Preview response */
export interface CvPreviewResponse {
  cvReady: boolean;
  status: string;
  cvMarkdown?: string;
  cvHtml?: string;
  extractedData?: ExtractedData;
  score?: number;
  cvTemplateKey?: CvTemplateKey;
  message?: string;
}

export interface CvTemplatePreviewResponse {
  templateKey: CvTemplateKey;
  cvMarkdown: string;
  cvHtml: string;
}

/** Extracted data from CV parsing */
export interface ExtractedData {
  contact: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    portfolio?: string;
    links?: string[];
  };
  summary?: string;
  skills: string[];
  competencies: string[];
  languages: string[];
  qualities: string[];
  interests: string[];
  experience: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate: string;
    highlights: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    startDate: string;
    endDate: string;
  }>;
  certifications: string[];
  projects: Array<{
    name: string;
    description: string;
    links: string[];
  }>;
}

/** Application status type */
export type ApplicationStatus =
  | 'new'
  | 'processing'
  | 'processed'
  | 'reviewing'
  | 'shortlisted'
  | 'rejected'
  | 'hired'
  | 'error';