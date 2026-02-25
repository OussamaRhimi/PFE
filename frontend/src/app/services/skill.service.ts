import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Skill {
  id: number;
  documentId: string;
  name: string;
}

interface StrapiSkillsResponse {
  data: Skill[];
  meta: any;
}

interface StrapiSkillResponse {
  data: Skill;
  meta: any;
}

@Injectable({
  providedIn: 'root',
})
export class SkillService {
  private readonly API_URL = 'http://localhost:1337/api/skills';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Skill[]> {
    return this.http.get<StrapiSkillsResponse>(this.API_URL).pipe(
      map((res) => res.data)
    );
  }

  /**
   * Search skills by name via GET /api/skills/search?q=<term>&limit=<n>
   * Returns a flat array (no Strapi wrapper) as defined in the backend controller.
   */
  search(q: string, limit = 10): Observable<Skill[]> {
    const params = new HttpParams()
      .set('q', q.trim())
      .set('limit', String(limit));
    return this.http.get<Skill[]>(`${this.API_URL}/search`, { params });
  }

  create(name: string): Observable<Skill> {
    return this.http.post<StrapiSkillResponse>(this.API_URL, { data: { name } }).pipe(
      map((res) => res.data)
    );
  }

  update(documentId: string, name: string): Observable<Skill> {
    return this.http.put<StrapiSkillResponse>(`${this.API_URL}/${documentId}`, { data: { name } }).pipe(
      map((res) => res.data)
    );
  }

  delete(documentId: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/${documentId}`);
  }
}
