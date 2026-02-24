import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  constructor(private http: HttpClient) {}

  getAll(): Observable<Skill[]> {
    return this.http.get<StrapiSkillsResponse>(this.API_URL).pipe(
      map((res) => res.data)
    );
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
