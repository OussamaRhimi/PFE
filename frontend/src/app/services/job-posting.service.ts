import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

/**
 * Requirements value object (stored as JSON in Strapi).
 * skillsRequired / skillsNiceToHave  -> skill names from the Skills table
 * departments                        -> department names from the Departments table
 */
export interface Requirements {
  skillsRequired: string[];
  skillsNiceToHave: string[];
  departments: string[];
  minYearsExperience: number | null;
  notes: string;
}

export function emptyRequirements(): Requirements {
  return { skillsRequired: [], skillsNiceToHave: [], departments: [], minYearsExperience: null, notes: '' };
}

export interface JobPosting {
  id: number;
  documentId: string;
  title: string;
  description: string;
  status: 'draft' | 'open' | 'closed';
  requirements: Requirements | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobPostingPayload {
  title: string;
  description?: string;
  requirements?: Requirements;
}

interface StrapiResponse<T> { data: T[]; meta: any; }
interface StrapiSingle<T>   { data: T;   meta: any; }

@Injectable({ providedIn: 'root' })
export class JobPostingService {
  private readonly apiUrl = 'http://localhost:1337/api/job-postings';

  constructor(private http: HttpClient) {}

  getAll(): Observable<JobPosting[]> {
    return this.http.get<StrapiResponse<JobPosting>>(this.apiUrl).pipe(
      map(res => res.data)
    );
  }

  /**
   * Public endpoint – returns only open job postings (no auth needed).
   */
  getPublicJobs(): Observable<JobPosting[]> {
    return this.http.get<StrapiResponse<JobPosting>>(`${this.apiUrl}/public`).pipe(
      map(res => res.data)
    );
  }

  getOne(documentId: string): Observable<JobPosting> {
    return this.http.get<StrapiSingle<JobPosting>>(`${this.apiUrl}/${documentId}`).pipe(
      map(res => res.data)
    );
  }

  create(payload: JobPostingPayload): Observable<JobPosting> {
    return this.http.post<StrapiSingle<JobPosting>>(this.apiUrl, { data: payload }).pipe(
      map(res => res.data)
    );
  }

  update(documentId: string, payload: Partial<JobPostingPayload>): Observable<JobPosting> {
    return this.http.put<StrapiSingle<JobPosting>>(`${this.apiUrl}/${documentId}`, { data: payload }).pipe(
      map(res => res.data)
    );
  }

  delete(documentId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${documentId}`);
  }

  /**
   * Change job posting status with server-side transition validation.
   */
  changeStatus(documentId: string, status: string): Observable<JobPosting> {
    return this.http.put<StrapiSingle<JobPosting>>(`${this.apiUrl}/${documentId}/status`, { status }).pipe(
      map(res => res.data)
    );
  }

  /**
   * Get count of candidates for a given job posting (for cascade warning).
   */
  getCandidateCount(documentId: string): Observable<number> {
    return this.http.get<any>(
      `http://localhost:1337/api/candidates?filters[jobPosting][documentId][$eq]=${documentId}&pagination[pageSize]=0`
    ).pipe(
      map(res => res?.meta?.pagination?.total ?? 0)
    );
  }
}
