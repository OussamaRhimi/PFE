# Sprint 1 - Fondations RH + CRUD de base

> **CRITICAL**: Follow this document exactly to ensure 100% consistency with the class diagram and sprint backlog. Do not deviate from specified structures, naming conventions, or implementation details.

---

## Table of Contents
1. [Overview](#overview)
2. [Class Diagram Requirements](#class-diagram-requirements)
3. [User Stories & Implementation Tasks](#user-stories--implementation-tasks)
4. [File Structure](#file-structure)
5. [Enum Definitions](#enum-definitions)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Testing Checklist](#testing-checklist)

---

## Overview

**Sprint Duration**: 20 days / member  
**Total Story Points**: 55  
**Focus**: Establish stable schema, basic CRUD for Skill/Department/JobPosting, HR authentication, and dashboard navigation.

### Core Components to Implement:
- Strapi schemas (Skill, Department, JobPosting)
- Autocomplete search endpoints
- JWT authentication for HR users
- Token interceptor and auth guard
- RH dashboard and CRUD UI components
- Routing structure for HR portal

---

## Class Diagram Requirements

### Entity: Skill
```typescript
{
  id: number;
  name: string;  // unique, required, 1-255 chars
}
```

### Entity: Department
```typescript
{
  id: number;
  name: string;  // unique, required
}
```

### Entity: JobPosting
```typescript
{
  id: number;
  title: string;
  description: string;
  status: JobPostingStatus;  // ENUM: draft, open, closed
  requirements: Requirements;  // embedded JSON value object
}
```

### Value Object: Requirements (Embedded JSON)
```typescript
type Requirements = {
  skillsRequired: string[];
  skillsNiceToHave: string[];
  departments: string[];
  minYearsExperience: number;
  notes: string;
};
```

### Entity: HRUser (Strapi Admin User)
```typescript
{
  id: number;
  email: string;
  password: string;
  role: string;  // admin, hr-manager, recruiter
}
```

---

## Enum Definitions

### JobPostingStatus
```typescript
enum JobPostingStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  CLOSED = 'closed'
}
```

---

## User Stories & Implementation Tasks

### S1-US1 (BE) - Create Skill Schema [Priority: HIGH, 5 days]
**Description**: Establish stable Skill entity with unique name constraint

**Files to Create/Update**:
- `backend/src/api/skill/content-types/skill/schema.json`

**Implementation**:
```json
{
  "kind": "collectionType",
  "collectionName": "skills",
  "info": {
    "singularName": "skill",
    "pluralName": "skills",
    "displayName": "Skill"
  },
  "options": {
    "increments": true,
    "timestamps": true,
    "draftAndPublish": false
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true,
      "minLength": 1,
      "maxLength": 255,
      "index": true
    }
  }
}
```

**Testing Checklist**:
- [ ] POST /api/skills creates skill
- [ ] Unique name constraint prevents duplicates
- [ ] GET /api/skills returns all skills
- [ ] DELETE removes skill
- [ ] Name validation (1-255 chars)

---

### S1-US2 (BE) - Create Department Schema [Priority: HIGH, 5 days]
**Description**: Establish stable Department entity with unique name constraint

**Files to Create/Update**:
- `backend/src/api/department/content-types/department/schema.json`

**Implementation**:
```json
{
  "kind": "collectionType",
  "collectionName": "departments",
  "info": {
    "singularName": "department",
    "pluralName": "departments",
    "displayName": "Department"
  },
  "options": {
    "increments": true,
    "timestamps": true,
    "draftAndPublish": false
  },
  "attributes": {
    "name": {
      "type": "text",
      "required": true,
      "unique": true,
      "index": true
    }
  }
}
```

**Testing Checklist**:
- [ ] POST /api/departments creates department
- [ ] Unique name constraint prevents duplicates
- [ ] GET /api/departments returns all departments
- [ ] DELETE removes department

---

### S1-US3 (BE) - Create JobPosting Schema [Priority: HIGH, 5 days]
**Description**: Establish JobPosting with embedded Requirements JSON

**Files to Create/Update**:
- `backend/src/api/job-posting/content-types/job-posting/schema.json`

**Implementation**:
```json
{
  "kind": "collectionType",
  "collectionName": "job_postings",
  "info": {
    "singularName": "job-posting",
    "pluralName": "job-postings",
    "displayName": "Job Posting"
  },
  "options": {
    "increments": true,
    "timestamps": true,
    "draftAndPublish": false
  },
  "attributes": {
    "title": {
      "type": "string",
      "required": true,
      "minLength": 3
    },
    "description": {
      "type": "richtext",
      "required": true
    },
    "status": {
      "type": "enumeration",
      "enum": ["draft", "open", "closed"],
      "default": "draft",
      "required": true
    },
    "requirements": {
      "type": "json",
      "required": false
    }
  }
}
```

**Testing Checklist**:
- [ ] POST /api/job-postings creates job posting
- [ ] Status defaults to 'draft'
- [ ] Requirements JSON is valid
- [ ] GET /api/job-postings returns all postings
- [ ] PUT updates job posting

---

### S1-US4 (BE) - Skill Search Endpoint [Priority: MEDIUM, 3 days]
**Description**: Fast autocomplete for skills

**Files to Create/Update**:
- `backend/src/api/skill/controllers/skill.ts`

**Implementation**:
```typescript
export default factories.createCoreController('api::skill.skill', {
  async find(ctx) {
    const { q } = ctx.query;
    
    if (q) {
      ctx.query.filters = {
        ...(ctx.query.filters as any || {}),
        name: { $containsi: String(q).trim() }
      };
    }
    
    ctx.query.fields = ['id', 'name'];
    ctx.query.sort = { name: 'asc' };
    ctx.query.pagination = { pageSize: 50 };
    
    return super.find(ctx);
  }
});
```

**API Endpoint**:
- GET `/api/skills?q=react` → returns matching skills (autocomplete)

---

### S1-US5 (BE) - Department Search Endpoint [Priority: MEDIUM, 3 days]
**Description**: Fast autocomplete for departments

**Files to Create/Update**:
- `backend/src/api/department/controllers/department.ts`

**Implementation**:
```typescript
export default factories.createCoreController('api::department.department', {
  async find(ctx) {
    const { q } = ctx.query;
    
    if (q) {
      ctx.query.filters = {
        ...(ctx.query.filters as any || {}),
        name: { $containsi: String(q).trim() }
      };
    }
    
    ctx.query.fields = ['id', 'name'];
    ctx.query.sort = { name: 'asc' };
    ctx.query.pagination = { pageSize: 50 };
    
    return super.find(ctx);
  }
});
```

**API Endpoint**:
- GET `/api/departments?q=engineering` → returns matching departments

---

### S1-US6 (BE) - HR Authentication Setup [Priority: HIGH, 4 days]
**Description**: JWT authentication for HR users

**Files to Create/Update**:
- `backend/config/middlewares.ts` (ensure JWT middleware is configured)
- `backend/src/api/auth/routes/auth.ts` (if custom auth routes needed)

**Implementation**:
Strapi provides out-of-the-box JWT auth at:
- POST `/api/auth/local` - login
- POST `/api/auth/local/register` - registration
- POST `/api/auth/logout` - logout

Response:
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "hr-user",
    "email": "hr@company.com",
    "provider": "local",
    "confirmed": true,
    "blocked": false,
    "role": 3
  }
}
```

---

### S1-US7 (FE) - Auth Service [Priority: HIGH, 4 days]
**Description**: Angular service for user authentication

**Files to Create/Update**:
- `frontend/src/app/services/auth.service.ts`

**Implementation**:
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface AuthResponse {
  jwt: string;
  user: {
    id: number;
    email: string;
    username: string;
    role: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private API_URL = 'http://localhost:1337/api/auth';
  private currentUserSubject = new BehaviorSubject<any>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(credentials: { identifier: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/local`, credentials).pipe(
      tap((response) => {
        localStorage.setItem('token', response.jwt);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private getUserFromStorage(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
}
```

---

### S1-US8 (FE) - Token Interceptor [Priority: HIGH, 3 days]
**Description**: Automatically attach JWT to all HTTP requests

**Files to Create/Update**:
- `frontend/src/app/interceptors/token.interceptor.ts`

**Implementation**:
```typescript
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(request);
  }
}
```

**Integration in app.config.ts**:
```typescript
import { TokenInterceptor } from './interceptors/token.interceptor';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([/* existing interceptors */])
    ),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true
    }
  ]
};
```

---

### S1-US9 (FE) - Auth Guard [Priority: HIGH, 3 days]
**Description**: Protect RH routes from unauthorized access

**Files to Create/Update**:
- `frontend/src/app/guards/auth.guard.ts`

**Implementation**:
```typescript
import { Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate: CanActivateFn = (route, state) => {
    if (this.authService.isLoggedIn()) {
      return true;
    }
    
    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  };
}

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
```

---

### S1-US10 (FE) - RH Routing [Priority: HIGH, 3 days]
**Description**: Setup routing for RH dashboard and management pages

**Files to Create/Update**:
- `frontend/src/app/app.routes.ts`

**Implementation**:
```typescript
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SkillsComponent } from './pages/skills/skills.component';
import { DepartmentsComponent } from './pages/departments/departments.component';
import { JobPostingsComponent } from './pages/job-postings/job-postings.component';
import { LoginComponent } from './pages/login/login.component';

export const appRoutes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  
  // RH Routes (Protected)
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'skills', 
    component: SkillsComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'departments', 
    component: DepartmentsComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'job-postings', 
    component: JobPostingsComponent, 
    canActivate: [authGuard] 
  },
  
  { path: '**', redirectTo: '/dashboard' }
];
```

---

### S1-US11 (FE) - Skill CRUD Service [Priority: MEDIUM, 3 days]
**Description**: Angular service for Skill management

**Files to Create/Update**:
- `frontend/src/app/services/skill.service.ts`

**Implementation**:
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Skill {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

interface StrapiResponse<T> {
  data: T[];
  meta: any;
}

interface StrapiSingle<T> {
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class SkillService {
  private API_URL = 'http://localhost:1337/api/skills';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Skill[]> {
    return this.http.get<StrapiResponse<Skill>>(this.API_URL).pipe(
      map(res => res.data)
    );
  }

  search(query: string): Observable<Skill[]> {
    return this.http.get<StrapiResponse<Skill>>(`${this.API_URL}?q=${query}`).pipe(
      map(res => res.data)
    );
  }

  create(name: string): Observable<Skill> {
    return this.http.post<StrapiSingle<Skill>>(this.API_URL, { data: { name } }).pipe(
      map(res => res.data)
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
```

---

### S1-US12 (FE) - Department CRUD Service [Priority: MEDIUM, 3 days]
**Description**: Angular service for Department management

**Files to Create/Update**:
- `frontend/src/app/services/department.service.ts`

**Implementation**:
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Department {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

interface StrapiResponse<T> {
  data: T[];
  meta: any;
}

interface StrapiSingle<T> {
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private API_URL = 'http://localhost:1337/api/departments';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Department[]> {
    return this.http.get<StrapiResponse<Department>>(this.API_URL).pipe(
      map(res => res.data)
    );
  }

  search(query: string): Observable<Department[]> {
    return this.http.get<StrapiResponse<Department>>(`${this.API_URL}?q=${query}`).pipe(
      map(res => res.data)
    );
  }

  create(name: string): Observable<Department> {
    return this.http.post<StrapiSingle<Department>>(this.API_URL, { data: { name } }).pipe(
      map(res => res.data)
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
```

---

### S1-US13 (FE) - JobPosting CRUD Service [Priority: MEDIUM, 3 days]
**Description**: Angular service for JobPosting management

**Files to Create/Update**:
- `frontend/src/app/services/job-posting.service.ts`

**Implementation**:
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Requirements {
  skillsRequired?: string[];
  skillsNiceToHave?: string[];
  departments?: string[];
  minYearsExperience?: number;
  notes?: string;
}

export interface JobPosting {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'open' | 'closed';
  requirements?: Requirements;
  createdAt?: string;
  updatedAt?: string;
}

interface StrapiResponse<T> {
  data: T[];
  meta: any;
}

interface StrapiSingle<T> {
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class JobPostingService {
  private API_URL = 'http://localhost:1337/api/job-postings';

  constructor(private http: HttpClient) {}

  getAll(): Observable<JobPosting[]> {
    return this.http.get<StrapiResponse<JobPosting>>(this.API_URL).pipe(
      map(res => res.data)
    );
  }

  getById(id: number): Observable<JobPosting> {
    return this.http.get<StrapiSingle<JobPosting>>(`${this.API_URL}/${id}`).pipe(
      map(res => res.data)
    );
  }

  create(payload: Omit<JobPosting, 'id'>): Observable<JobPosting> {
    return this.http.post<StrapiSingle<JobPosting>>(this.API_URL, { data: payload }).pipe(
      map(res => res.data)
    );
  }

  update(id: number, payload: Partial<JobPosting>): Observable<JobPosting> {
    return this.http.put<StrapiSingle<JobPosting>>(`${this.API_URL}/${id}`, { data: payload }).pipe(
      map(res => res.data)
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
```

---

### S1-US14 (FE) - Skills CRUD Component [Priority: MEDIUM, 4 days]
**Description**: Frontend component for skill management

**Files to Create/Update**:
- `frontend/src/app/pages/skills/skills.component.ts`
- `frontend/src/app/pages/skills/skills.component.html`
- `frontend/src/app/pages/skills/skills.component.scss`

**Implementation**:
```typescript
import { Component, OnInit } from '@angular/core';
import { SkillService, Skill } from '../../services/skill.service';

@Component({
  selector: 'app-skills',
  templateUrl: './skills.component.html',
  styleUrls: ['./skills.component.scss']
})
export class SkillsComponent implements OnInit {
  skills: Skill[] = [];
  newSkillName = '';
  loading = false;
  error: string | null = null;

  constructor(private skillService: SkillService) {}

  ngOnInit(): void {
    this.loadSkills();
  }

  loadSkills(): void {
    this.loading = true;
    this.skillService.getAll().subscribe({
      next: (data) => {
        this.skills = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load skills';
        this.loading = false;
      }
    });
  }

  addSkill(): void {
    if (!this.newSkillName.trim()) return;
    
    this.skillService.create(this.newSkillName.trim()).subscribe({
      next: (skill) => {
        this.skills.push(skill);
        this.newSkillName = '';
      },
      error: (err) => {
        this.error = 'Failed to create skill';
      }
    });
  }

  deleteSkill(id: number): void {
    if (confirm('Are you sure?')) {
      this.skillService.delete(id).subscribe({
        next: () => {
          this.skills = this.skills.filter(s => s.id !== id);
        },
        error: (err) => {
          this.error = 'Failed to delete skill';
        }
      });
    }
  }
}
```

---

### S1-US15 (FE) - Departments CRUD Component [Priority: MEDIUM, 4 days]
**Description**: Frontend component for department management

**Files to Create/Update**:
- `frontend/src/app/pages/departments/departments.component.ts`

---

### S1-US16 (FE) - JobPostings CRUD Component [Priority: MEDIUM, 5 days]
**Description**: Frontend component for job posting management

**Files to Create/Update**:
- `frontend/src/app/pages/job-postings/job-postings.component.ts`
- `frontend/src/app/pages/job-postings/job-posting-form.component.ts`

---

## File Structure

### Backend
```
backend/src/
├── api/
│   ├── skill/
│   │   ├── content-types/skill/
│   │   │   └── schema.json
│   │   └── controllers/
│   │       └── skill.ts
│   ├── department/
│   │   ├── content-types/department/
│   │   │   └── schema.json
│   │   └── controllers/
│   │       └── department.ts
│   └── job-posting/
│       ├── content-types/job-posting/
│       │   └── schema.json
│       └── controllers/
│           └── job-posting.ts
└── config/
    └── middlewares.ts
```

### Frontend
```
frontend/src/app/
├── services/
│   ├── auth.service.ts
│   ├── skill.service.ts
│   ├── department.service.ts
│   └── job-posting.service.ts
├── interceptors/
│   └── token.interceptor.ts
├── guards/
│   └── auth.guard.ts
├── pages/
│   ├── login/
│   │   └── login.component.ts
│   ├── dashboard/
│   │   └── dashboard.component.ts
│   ├── skills/
│   │   └── skills.component.ts
│   ├── departments/
│   │   └── departments.component.ts
│   └── job-postings/
│       ├── job-postings.component.ts
│       └── job-posting-form.component.ts
└── app.routes.ts
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/local` | ❌ | Login |
| POST | `/api/auth/logout` | ✅ | Logout |
| GET | `/api/skills` | ✅ | List all skills |
| GET | `/api/skills?q={query}` | ✅ | Search skills |
| POST | `/api/skills` | ✅ | Create skill |
| PUT | `/api/skills/{id}` | ✅ | Update skill |
| DELETE | `/api/skills/{id}` | ✅ | Delete skill |
| GET | `/api/departments` | ✅ | List all departments |
| GET | `/api/departments?q={query}` | ✅ | Search departments |
| POST | `/api/departments` | ✅ | Create department |
| PUT | `/api/departments/{id}` | ✅ | Update department |
| DELETE | `/api/departments/{id}` | ✅ | Delete department |
| GET | `/api/job-postings` | ✅ | List all job postings |
| GET | `/api/job-postings/{id}` | ✅ | Get job posting detail |
| POST | `/api/job-postings` | ✅ | Create job posting |
| PUT | `/api/job-postings/{id}` | ✅ | Update job posting |
| DELETE | `/api/job-postings/{id}` | ✅ | Delete job posting |

---

## Testing Checklist

### Backend
- [ ] All Strapi schemas created and migrated
- [ ] Skill unique constraint enforced
- [ ] Department unique constraint enforced
- [ ] JobPosting status defaults to 'draft'
- [ ] Autocomplete endpoints return correct results
- [ ] JWT authentication working
- [ ] Protected routes require token

### Frontend
- [ ] Login page functional
- [ ] Token stored in localStorage after login
- [ ] Token interceptor adds Authorization header
- [ ] Auth guard redirects to login if not authenticated
- [ ] All protected routes work when logged in
- [ ] Skills CRUD component fully functional
- [ ] Departments CRUD component fully functional
- [ ] JobPostings CRUD component fully functional
- [ ] Logout clears token and redirects to login
- [ ] 404 redirects to dashboard

---

## Notes
- All timestamps are ISO 8601 format
- All responses follow Strapi structure (data/meta)
- Frontend uses RxJS Observables (no Promises)
- All services are Injectable at root level
