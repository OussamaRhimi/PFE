import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Department {
    id: number;
    documentId: string;
    name: string;
    // Si tu as d'autres champs comme createdAt, etc., tu peux les ajouter
}

interface StrapiResponse<T> {
    data: T[];
    meta: any;
}

interface StrapiSingleResponse<T> {
    data: T;
    meta: any;
}

@Injectable({
    providedIn: 'root'
})
export class DepartmentService {
    private apiUrl = 'http://localhost:1337/api/departments'; // adapte si nécessaire

    constructor(private http: HttpClient) { }

    /** Récupère tous les départements */
    getAll(): Observable<Department[]> {
        return this.http.get<StrapiResponse<Department>>(this.apiUrl).pipe(
            map(res => res.data)
        );
    }

    /** Crée un nouveau département */
    create(name: string): Observable<Department> {
        return this.http.post<StrapiSingleResponse<Department>>(this.apiUrl, {
            data: { name }
        }).pipe(
            map(res => res.data)
        );
    }

    /** Met à jour un département existant */
    update(documentId: string, name: string): Observable<Department> {
        return this.http.put<StrapiSingleResponse<Department>>(`${this.apiUrl}/${documentId}`, {
            data: { name }
        }).pipe(
            map(res => res.data)
        );
    }

    /** Supprime un département */
    delete(documentId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${documentId}`);
    }
}