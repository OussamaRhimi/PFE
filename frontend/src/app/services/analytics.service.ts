import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AnalyticsResponse {
  totals: {
    candidates: number;
    jobs: number;
    openJobs: number;
  };
  statusCounts: Record<string, number>;
  scoreBuckets: Array<{ label: string; min: number; max: number; count: number }>;
  monthlyApplications: Array<{ month: string; count: number }>;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly apiUrl = 'http://localhost:1337/api/hr/analytics';

  constructor(private http: HttpClient) {}

  getAnalytics(): Observable<AnalyticsResponse> {
    return this.http.get<AnalyticsResponse>(this.apiUrl);
  }
}
