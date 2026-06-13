# 📚 Frontend — Complete Codebase Explained
> **Framework:** Angular 18 (standalone components, no NgModule) · **Backend:** Strapi CMS (REST API at `http://localhost:1337/api`)  
> **Goal:** An AI-powered Hiring Platform called **IoHire** with a public-facing candidate portal AND a private HR dashboard.

---

## 🗂️ Folder Structure Overview

```
frontend/
└── src/
    ├── index.html              ← Single HTML page (SPA entry)
    ├── main.ts                 ← Angular bootstrapper
    ├── styles.scss             ← Global CSS
    ├── types/                  ← TypeScript ambient type declarations
    └── app/
        ├── app.ts              ← Root component (layout shell)
        ├── app.html            ← Root template (sidebar + router-outlet)
        ├── app.scss            ← Root styles
        ├── app.routes.ts       ← ALL application routes defined here
        ├── app.config.ts       ← Angular providers (HTTP, router, interceptor)
        ├── components/         ← Reusable UI building blocks
        ├── guards/             ← Route protection
        ├── interceptors/       ← HTTP middleware
        ├── pages/              ← Full-page views (one per route)
        └── services/           ← Data fetching & business logic
```

---

## 1. 🚀 Entry Points

### `src/main.ts`
```typescript
// Boots the Angular app using appConfig
bootstrapApplication(App, appConfig);
```
This is the very first file that runs. It tells Angular "start the app using the `App` component with the settings in `appConfig`."

### `src/index.html`
The single HTML page. Contains `<app-root></app-root>`, which Angular replaces with the actual application.

### `src/styles.scss`
Global stylesheet loaded for every page. Defines base styles, fonts (Inter from Google Fonts), and reset styles.

---

## 2. ⚙️ App Configuration — `app.config.ts`

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),                          // loads all routes
    provideHttpClient(withInterceptorsFromDi()),    // enables HTTP requests
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,                  // attaches JWT to every request
      multi: true,
    },
  ],
};
```

**What this does in plain English:**
- Sets up the router so Angular knows which component to show for each URL.
- Sets up the HTTP client so the app can talk to the backend (Strapi).
- Registers the `TokenInterceptor` so every HTTP request automatically includes the logged-in user's JWT token in its `Authorization` header.

---

## 3. 🧭 Routing — `app.routes.ts`

This file is the **navigation map** of the entire app. It tells Angular: _"when the user goes to URL X, show component Y"_.

```typescript
export const routes: Routes = [
  // ── PUBLIC (no login required) ──
  { path: '',               component: HomePageComponent },       // → /
  { path: 'jobs',           component: PublicJobListComponent },  // → /jobs
  { path: 'jobs/:jobId/apply', component: ApplyComponent },       // → /jobs/abc123/apply
  { path: 'track',          component: TrackComponent },          // → /track
  { path: 'withdraw/:token',component: WithdrawComponent },       // → /withdraw/TOKEN
  { path: 'recommendations',component: RecommendationComponent }, // → /recommendations
  { path: 'login',          component: LoginComponent },          // → /login

  // ── PRIVATE (login required — protected by authGuard) ──
  { path: 'dashboard',      component: DashboardComponent,      canActivate: [authGuard] },
  { path: 'analytics',      component: AnalyticsComponent,      canActivate: [authGuard] },
  { path: 'skills',         component: SkillsComponent,         canActivate: [authGuard] },
  { path: 'departments',    component: DepartmentsComponent,    canActivate: [authGuard] },
  { path: 'job-postings',   component: JobPostingsComponent,    canActivate: [authGuard] },
  { path: 'job-postings/new',      component: JobPostingFormComponent, canActivate: [authGuard] },
  { path: 'job-postings/:id/edit', component: JobPostingFormComponent, canActivate: [authGuard] },
  { path: 'ai-evaluation',  component: AiEvaluationComponent,   canActivate: [authGuard] },
  { path: 'candidates',     component: CandidatesListComponent, canActivate: [authGuard] },
  { path: 'candidates/:id', component: CandidateDetailComponent,canActivate: [authGuard] },
  { path: 'cv-templates',   component: CvTemplatesComponent,    canActivate: [authGuard] },

  { path: '**', redirectTo: '/' }, // any unknown URL → home
];
```

**Two categories of pages:**

| Type | Who sees it | Protection |
|------|------------|------------|
| **Public** | Everyone (candidates, visitors) | None |
| **HR/Private** | HR staff only (must be logged in) | `canActivate: [authGuard]` |

---

## 4. 🏠 Root Component — `app.ts` + `app.html`

This is the **layout shell**. It wraps everything and decides whether to show:
- **Public layout** (just the page, with the floating chat widget)
- **HR layout** (sidebar navigation + the page)

### `app.ts` Logic

```typescript
export class App {
  sidebarCollapsed = false;
  private readonly publicRoutes = ['/login', '/', '/jobs', '/track', '/withdraw', '/recommendations'];

  constructor(public authService: AuthService, public i18n: I18nService, private router: Router) {
    // Switches translation scope based on current route
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => this.i18n.setScope(this.isPublicRoute(url) ? 'public' : 'hr'));
  }

  showShell(): boolean {
    // Returns true only when user is logged in AND on an HR route
    return !this.isPublicRoute(this.router.url) && this.authService.isLoggedIn();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
```

### `app.html` Structure

```html
<!-- If NOT a logged-in HR user → show public layout -->
<ng-container *ngIf="!showShell(); else shell">
  <div class="public-content">
    <router-outlet />         <!-- loads the current page's component -->
    <app-public-chat-widget /> <!-- floating AI chat bubble (bottom-right) -->
  </div>
</ng-container>

<!-- If logged-in HR user → show sidebar + main content -->
<ng-template #shell>
  <div class="app-body">
    <aside class="sidebar" [class.collapsed]="sidebarCollapsed">
      <!-- Logo + burger toggle button -->
      <!-- Navigation links (Dashboard, Analytics, AI Eval, Skills, Departments, Job Postings, CV Templates, Candidates) -->
      <!-- Language toggle (FR / EN) -->
      <!-- User info + Logout button -->
    </aside>
    <main class="main-content">
      <router-outlet />  <!-- HR page content loads here -->
    </main>
  </div>
</ng-template>
```

**Key idea:** The `<router-outlet>` is the **placeholder** where Angular injects the component for the current URL. Everything outside it (sidebar, navbar) stays fixed.

---

## 5. 🔒 Guards — `guards/auth.guard.ts`

A **guard** is a function that runs before a page loads. If it returns `false`, Angular blocks navigation and redirects.

```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;  // ✅ Let them through
  }

  // ❌ Not logged in — send them to login, remembering where they wanted to go
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
```

**Example:** If you try to visit `/dashboard` without being logged in:
1. `authGuard` runs
2. `isLoggedIn()` returns `false`
3. Angular redirects you to `/login?returnUrl=/dashboard`
4. After successful login, you're redirected back to `/dashboard`

---

## 6. 🔑 Interceptors — `interceptors/token.interceptor.ts`

An **interceptor** is middleware that wraps every HTTP request. This one does two things:

```typescript
export class TokenInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {

    // 1. Attach JWT token to every request
    const token = this.authService.getToken();
    if (token) {
      request = request.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    // 2. Handle 401 (expired/invalid token) → auto-logout
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
```

**Plain English:** Every time the app calls the backend API, this interceptor automatically glues `Authorization: Bearer <your-jwt-token>` to the request header. If the server responds with `401 Unauthorized`, the interceptor logs you out and redirects to login.

---

## 7. 🧩 Components — `app/components/`

Components in this folder are **reusable UI widgets** used across multiple pages. They are **not full pages** themselves.

```
components/
├── department-autocomplete/   ← Search+select dropdown for departments
├── location-map/              ← Leaflet.js interactive map
├── public-chat-widget/        ← Floating AI chat bubble (public pages)
├── public-footer/             ← Footer for public pages
├── public-navbar/             ← Top navigation bar for public pages
├── skill-autocomplete/        ← Search+select dropdown for skills
└── reveal-on-scroll.directive.ts ← Animation: fade-in when element enters viewport
```

---

### 7.1 `public-navbar` — Top Navigation Bar

**Selector:** `<app-public-navbar>`  
**Used in:** `HomePageComponent`, `PublicJobListComponent`, `ApplyComponent`, `TrackComponent`, `RecommendationComponent`, `LoginComponent`

```typescript
// Shows the top bar on public pages:
// [Logo IoHire] | [Job Openings] [Recommendations] [Track Application] | [FR/EN toggle] [Sign in]
```

Contains:
- Brand logo + "IoHire" name → links to home
- Nav links: **Job Openings** (`/jobs`), **Recommendations** (`/recommendations`), **Track Application** (`/track`)
- Language toggle (FR ↔ EN) via `i18n.toggle()`
- **Sign in** button → `/login`

---

### 7.2 `public-footer` — Bottom Footer

**Selector:** `<app-public-footer>`  
**Used in:** Same public pages as the navbar

```html
<!-- Rendered by the component -->
<footer class="footer page-footer">
  <div class="footer-inner">
    <div class="footer-top">
      <div class="footer-brand">[Logo] IoHire</div>
      <nav class="footer-links">
        <a routerLink="/jobs">Job Openings</a>
        <a routerLink="/recommendations">Recommendations</a>
        <a routerLink="/track">Track Application</a>
        <a routerLink="/login">Sign in</a>
      </nav>
    </div>
    <div class="footer-bottom">
      <p>© 2026 IoHire — Intelligent Hiring Platform</p>
    </div>
  </div>
</footer>
```

> **Note:** The footer has the class `page-footer`. The `PublicChatWidgetComponent` uses this class to detect footer overlap and pushes the chat bubble upward automatically.

---

### 7.3 `public-chat-widget` — AI Chat Bubble

**Selector:** `<app-public-chat-widget>`  
**Used in:** `app.html` (appears on ALL public pages)

This is the floating red chat button in the bottom-right corner of every public page.

```typescript
// State
open = false;       // is panel visible?
loading = false;    // waiting for AI reply?
draft = '';         // user's current typed message
messages: ChatMessage[] = [];  // conversation history
footerOffset = 0;   // how many px above bottom (to avoid covering the footer)
```

**How it works:**

```
User types message → clicks "Send"
  ↓
send() is called:
  1. Appends user message to messages[]
  2. Calls candidateService.publicChat(history)  →  POST /api/public/chat
  3. AI reply appended to messages[]
```

**Footer-aware positioning:**
```typescript
@HostListener('window:scroll')
onViewportChange(): void {
  // Finds all elements with class .page-footer
  // If footer is visible in viewport, raises the widget above it
  this.footerOffset = <overlap in px>;
}
```

```html
<!-- Usage: automatically included on all public pages -->
<!-- No configuration needed — just drop it in app.html -->
<app-public-chat-widget />
```

---

### 7.4 `skill-autocomplete` — Live Skill Search Dropdown

**Selector:** `<app-skill-autocomplete>`  
**Used in:** `JobPostingFormComponent` (for required skills and nice-to-have skills)

This is a smart search-as-you-type input that queries the backend for skills.

```typescript
// Inputs
@Input() placeholder = 'Search skills...';
@Input() set initialValue(val: string) { this.query = val || ''; }

// Outputs (events fired to parent)
@Output() skillSelected = new EventEmitter<Skill>();   // user selected a skill
@Output() searchResults = new EventEmitter<Skill[]>(); // backend returned results
@Output() searchCleared = new EventEmitter<void>();    // user cleared the input
@Output() queryChange = new EventEmitter<string>();    // text changed
```

**The reactive search pipeline:**
```typescript
ngOnInit() {
  this.searchSubject.pipe(
    debounceTime(250),          // wait 250ms after user stops typing
    distinctUntilChanged(),     // don't re-search if query didn't change
    filter(q => q.trim().length > 0),
    switchMap(q => this.skillService.search(q, 20))  // cancel previous request
  ).subscribe(results => {
    this.suggestions = results;  // update the dropdown
  });
}
```

**Usage example in a parent component:**
```html
<app-skill-autocomplete
  placeholder="Type to search required skills"
  (skillSelected)="addRequiredSkill($event)"
  (searchCleared)="clearRequiredSkills()"
>
</app-skill-autocomplete>
```

**UX features:**
- ⬆️⬇️ Arrow keys to navigate suggestions
- `Enter` to select, `Escape` to close
- Matching text is **highlighted** in the dropdown (e.g., "ang" in "**Ang**ular")
- Click outside to close the dropdown

---

### 7.5 `department-autocomplete` — Live Department Search Dropdown

**Selector:** `<app-department-autocomplete>`  
**Used in:** `JobPostingFormComponent` (for selecting departments)

Identical in behavior to `skill-autocomplete` but for departments.

```typescript
@Output() departmentSelected = new EventEmitter<Department>();
@Output() searchResults = new EventEmitter<Department[]>();
@Output() searchCleared = new EventEmitter<void>();
@Output() queryChange = new EventEmitter<string>();
```

Uses `DepartmentService.search(q, limit)` → `GET /api/departments/search?q=...`

```html
<!-- Usage -->
<app-department-autocomplete
  placeholder="Type to search departments"
  (departmentSelected)="addDepartment($event)"
>
</app-department-autocomplete>
```

---

### 7.6 `location-map` — Interactive Map (Leaflet.js)

**Selector:** `<app-location-map>`  
**Used in:** `CandidateDetailComponent` (shows candidate's city on a map)

Takes a city/country string and renders an OpenStreetMap tile map with a custom animated pin.

```typescript
@Input() location: string = '';  // e.g., "Sfax, Tunisia"
@Input() height = 320;           // map height in pixels
```

**How it resolves coordinates:**
```typescript
private findCoordinates(location: string): [lat, lng] | null {
  // 1. Check known Tunisian cities (Sfax, Tunis, Sousse, etc.)
  // 2. Check known world cities (Paris, London, Dubai, etc.)
  // 3. If "Tunisia" is mentioned → center of Tunisia
  // 4. If nothing matches → returns null (shows error state)
}
```

```html
<!-- Usage in CandidateDetailComponent -->
<app-location-map
  [location]="candidate.city + ', ' + candidate.country"
  [height]="280"
>
</app-location-map>
```

**States:** Loading spinner → Map with bouncing red pin → Error message (if city not found)

---

### 7.7 `RevealOnScrollDirective` — Scroll Animation

**Selector:** `[appRevealOnScroll]`  
**Used in:** `HomePageComponent` (landing page sections)

Makes any element **fade-in when it enters the viewport** as the user scrolls.

```typescript
@Directive({ selector: '[appRevealOnScroll]', standalone: true })
export class RevealOnScrollDirective implements AfterViewInit {
  @Input() revealDelay = 0;  // delay in ms before animation starts

  ngAfterViewInit() {
    const element = this.el.nativeElement;
    element.classList.add('reveal');  // starts hidden
    element.style.setProperty('--reveal-delay', `${this.revealDelay}ms`);

    // IntersectionObserver fires when element is 15% visible
    this.observer = new IntersectionObserver(entries => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible');  // triggers CSS animation
        this.observer.unobserve(entry.target);          // fire only once
      }
    }, { threshold: 0.15 });
  }
}
```

**Usage with staggered delays:**
```html
<!-- Each section fades in 100ms after the previous one -->
<section appRevealOnScroll [revealDelay]="0">Hero</section>
<section appRevealOnScroll [revealDelay]="100">Stats</section>
<section appRevealOnScroll [revealDelay]="200">Features</section>
```

---

## 8. 📄 Pages — `app/pages/`

Full-page components, one per route. Each handles its own data loading, state, and template.

```
pages/
├── home-page/        ← / (public landing page)
├── login/            ← /login
├── dashboard/        ← /dashboard (HR home)
├── analytics/        ← /analytics
├── skills/           ← /skills
├── departments/      ← /departments
├── job-postings/     ← /job-postings + /job-postings/new + /job-postings/:id/edit
├── ai-evaluation/    ← /ai-evaluation
├── candidates/       ← /candidates + /candidates/:id
├── cv-templates/     ← /cv-templates
└── public-jobs/      ← /jobs, /jobs/:id/apply, /track, /withdraw/:token, /recommendations
```

---

### 8.1 `home-page` — Landing Page (`/`)

**File:** `home-page.component.ts` + `.html` + `.scss`  
**Accessible to:** Everyone

The marketing/landing page for IoHire. Features:

| Section | Description |
|---------|-------------|
| **Hero** | Typing animation (character-by-character), animated stat counters (500+, 95%, 60%, 24/7) |
| **Features** | Grid of 6 feature cards with icons (Easy Upload, Parsing, Templates, Assessment, Matching, GDPR) |
| **Tech Stack** | Angular, Strapi, PostgreSQL, Docker |
| **Company Info** | iOvision details, expertise areas |
| **CTA** | Links to `/jobs` and `/dashboard` |

**Key animations:**
```typescript
// Typing effect: types text letter by letter
startTyping() {
  let i = 0;
  this.typingInterval = setInterval(() => {
    this.typedText.set(this.fullText.substring(0, i + 1));
    i++;
  }, 100);  // 100ms per character
}

// Counter animation: counts up from 0 to target with easing
animateStats() {
  const duration = 2000;  // 2 seconds
  // easing: progress * (2 - progress) → ease-out curve
  const easing = progress * (2 - progress);
  // Updates stats signal every ~33ms (60fps)
}
```

**Uses components:** `<app-public-navbar>`, `<app-public-footer>`, `[appRevealOnScroll]`, `LucideAngularModule` (icon library)

---

### 8.2 `login` — Login Page (`/login`)

**File:** `login.component.ts` + `.html` + `.scss`  
**Accessible to:** Everyone (redirects to dashboard if already logged in)

```typescript
export class LoginComponent implements OnInit {
  loginForm: FormGroup;  // Angular Reactive Form

  constructor(...) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);  // already logged in → skip
    }

    this.loginForm = this.formBuilder.group({
      identifier: ['', Validators.required],           // email or username
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;
    this.authService.login(this.loginForm.value).subscribe({
      next: () => this.router.navigateByUrl(this.returnUrl),  // go to where they wanted
      error: (err) => this.error = err.error?.message || 'Login failed',
    });
  }
}
```

**Uses components:** `<app-public-navbar>`, `<app-public-footer>`

---

### 8.3 `dashboard` — HR Home (`/dashboard`) 🔒

**File:** `dashboard.component.ts`  
**Accessible to:** HR staff (auth required)

The first page an HR user sees after logging in. Shows:
- Welcome card with user info (username, email)
- **Analytics overview** (loaded from `AnalyticsService`):
  - Stats cards: Total candidates, Total job postings, Open roles
  - Bar charts: Status breakdown, Score distribution, Applications over time
- **Quick access cards:** Skills, Departments, Job Postings

```typescript
ngOnInit() {
  this.loadAnalytics();
}

private loadAnalytics() {
  this.analyticsService.getAnalytics().subscribe({
    next: (res) => {
      this.analytics = res;
      // Transform statusCounts object into sorted array for bar chart
      this.statusSeries = Object.entries(res.statusCounts)
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      // scoreBuckets for score distribution chart
      this.scoreSeries = res.scoreBuckets.map(b => ({ label: b.label, count: b.count }));

      // monthlyApplications for time series chart
      this.monthSeries = res.monthlyApplications;

      // Max values for bar width percentages
      this.statusMax = Math.max(1, ...this.statusSeries.map(s => s.count));
    }
  });
}
```

**Bar chart rendering (inline HTML, no chart library):**
```html
<div class="bar-row" *ngFor="let item of statusSeries">
  <span class="bar-label">{{ statusLabel(item.status) }}</span>
  <div class="bar-track">
    <!-- Width calculated as (count / max) * 100% -->
    <span [style.width.%]="(item.count / statusMax) * 100"></span>
  </div>
  <span class="bar-value">{{ item.count }}</span>
</div>
```

---

### 8.4 `analytics` — Advanced Analytics (`/analytics`) 🔒

**File:** `analytics.component.ts`  
**Accessible to:** HR staff

More detailed analytics using **Chart.js** (doughnut charts, line charts, bar charts). Loads from both `AnalyticsService` and `CandidateService`. Shows pipeline funnel, score trends, monthly volumes, skill gap analysis.

---

### 8.5 `skills` — Skills Management (`/skills`) 🔒

**File:** `skills.component.ts` (+ `Composant-autocomplete.ts`)  
**Accessible to:** HR staff

Full CRUD for the skills catalog (create, read, update, delete). Used to populate the skill options in job posting forms.

---

### 8.6 `departments` — Departments Management (`/departments`) 🔒

**Files:** `departments.component.ts` + `.html` + `.scss`  
**Accessible to:** HR staff

Full CRUD for departments. Uses `DepartmentService`.

---

### 8.7 `job-postings` — Job Postings Management (`/job-postings`) 🔒

**Files:** `job-postings.component.ts` + `job-posting-form.component.ts`  
**Accessible to:** HR staff

**`job-postings.component.ts`** — List view:

Shows all job postings as cards. Each card has:
```
[Job Title]                   [Status badge: Draft/Open/Closed]
[Required Skills pills]
[Experience Required]
─────────────────────────────────────────────────────
[👥 X applicants] [📅 Posted YYYY-MM-DD]    [Status select ▾] [✏️] [🗑️]
```

**Status change flow:**
```typescript
setStatus(job, newStatus) {
  // Opens a confirmation modal first
  this.statusConfirm = { job, newStatus };
}

confirmStatusChange() {
  // Calls API → updates local list → shows success message for 3s
  this.jobService.changeStatus(job.documentId, newStatus).subscribe(...);
}
```

**Delete flow:**
```typescript
askDelete(job) {
  // First fetches how many candidates linked to this job
  this.jobService.getCandidateCount(job.documentId).subscribe(count => {
    // Shows warning if count > 0 ("This will delete X candidates too!")
    this.deleteConfirm = { job, candidateCount: count };
  });
}
```

**`job-posting-form.component.ts`** — Create/Edit form (`/job-postings/new` and `/job-postings/:id/edit`):

Complex form with:
- Title, Description text areas
- `<app-skill-autocomplete>` for required skills (multi-select with chips)
- `<app-skill-autocomplete>` for nice-to-have skills
- `<app-department-autocomplete>` for departments
- Location, Employment type, Min years experience
- **Evaluation Config section** (weights for scoring algorithm):
  - Fit weight vs Completeness weight (must sum to 100)
  - Required/Nice-to-Have/Experience sub-weights
  - Completeness points per CV field
  - Custom bonus/penalty criteria
  - Quality thresholds (Excellent/Good/Fair score boundaries)

---

### 8.8 `ai-evaluation` — AI Scoring Config (`/ai-evaluation`) 🔒

**File:** `ai-evaluation.component.ts`  
**Accessible to:** HR staff

A dedicated page (separate from the job form) to fine-tune the AI scoring configuration per job posting.

```
Select a job posting: [dropdown]
─────────────────────────────────
Score Weights:
  Fit weight: [slider 0-100]
  Completeness weight: [auto = 100 - fit]

Fit Score Breakdown:
  Required Skills: [weight]
  Nice-to-Have Skills: [weight]
  Experience: [weight]

Completeness Points:
  Full Name: [number]   Email: [number]   Phone: [number] ...

Custom Criteria:
  [+ Add Criterion] → name, type (bonus/penalty), points, keywords

Quality Thresholds:
  Excellent: score >= [85]
  Good: score >= [70]
  Fair: score >= [50]
  Poor: score < 50
```

---

### 8.9 `candidates` — Candidate Management 🔒

#### `candidates-list.component.ts` — All Candidates (`/candidates`)

A feature-rich data table showing all candidates across all jobs.

**Filters available:**
```
[Search by: All/Name/Email/Status/Job ▾] [🔍 search input]
[Status filter ▾]  [Job filter ▾]  [Score: ≥/≤ [slider] 70%]
```

**Bulk actions:**
```
[0 selected] [Select Page] [Clear] [Set status ▾] [Apply]
```

**Table columns:**
| ☐ | Candidate (avatar + name + email) | Status badge | Score bar | Job Title | Date | View → |

**Sorting:** Click any column header to sort asc/desc (sends `sort=field:order` to API).

**Pagination:** 25 per page, previous/next with page counter.

**How data loads:**
```typescript
load() {
  this.candidateService.getAllHr(
    this.currentPage,
    this.pageSize,
    `${this.sortField}:${this.sortOrder}`,
    {
      status: this.statusFilter,
      search: this.searchQuery,
      searchField: this.searchField,
      jobPostingId: this.jobPostingFilter,
      scoreOperator: 'gt',
      scoreThreshold: this.scoreThreshold,
    }
  ).subscribe(res => {
    this.candidates = res.data;
    this.totalCount = res.meta.pagination.total;
    this.totalPages = res.meta.pagination.pageCount;
  });
}
```

#### `candidate-detail.component.ts` — Single Candidate (`/candidates/:id`)

The most complex page. Shows everything about one candidate:
- Personal info (name, email, LinkedIn, portfolio, city, country)
- `<app-location-map>` showing their city
- Resume download button
- Status management (with transition validation)
- AI Score display with quality label (Excellent/Good/Fair/Poor)
- Extracted CV data (skills, experience, education, certifications, projects)
- Standardized CV preview + template selection
- HR Notes editor
- Reprocess button (re-run AI pipeline)

---

### 8.10 `cv-templates` — CV Template Library (`/cv-templates`) 🔒

**File:** `cv-templates.component.ts`  
**Accessible to:** HR staff

Manage which CV template is the **default** used when generating standardized CVs for candidates. 11 templates available:

| Key | Display Name |
|-----|-------------|
| `standard` | Standard |
| `experience_first` | Experience First |
| `skills_first` | Skills First |
| `compact` | Compact |
| `education_first` | Education First |
| `project_focus` | Project Focus |
| `sidebar_photo` | Sidebar with Photo |
| `accent_pink` | Accent Pink |
| `teal_circle` | Teal Circle |
| `navy_gold` | Navy & Gold |
| `sunset` | Sunset |

Left panel = template list. Right panel = HTML preview of selected template.

---

### 8.11 Public-Facing Pages — `public-jobs/`

These are pages for **job candidates** (not HR staff).

#### `public-job-list.component.ts` — Job Board (`/jobs`)

Shows all open jobs as cards. Features:
- Search by title, skill, department, location, employment type
- Animated page transitions (slide left/right between pages)
- Responsive: 3 cards/page on desktop, 2 on tablet, 1 on mobile
- "Apply Now" button → `/jobs/:id/apply`

```typescript
// Animated pagination
nextPage() {
  this.transitionJobs = this.getPage(this.currentPage);  // save current jobs
  this.animDirection = 'next';
  this.isAnimating = true;
  this.currentPage++;
  setTimeout(() => { this.isAnimating = false; }, 260);  // CSS animation duration
}
```

---

#### `apply.component.ts` — Application Form (`/jobs/:jobId/apply`)

The form a candidate fills out to apply for a job. Fields:
- Full Name*, Email*, LinkedIn, Portfolio
- Country* (dropdown), City* (dependent on country)
- Years of Experience
- Notes (optional)
- **Resume upload*** — drag & drop or click, accepts PDF/DOC/DOCX up to 5MB
- **GDPR consent checkbox*** — required before submitting

```typescript
onSubmit() {
  const payload: ApplyPayload = {
    fullName, email, country, city, linkedin, portfolio,
    candidateNotes, selfReportedYearsExperience,
    jobPostingId: this.job.documentId,
    consent: true,
    resume: this.resumeFile!,  // File object
  };

  // CandidateService.apply() builds FormData and POSTs to /api/candidates/apply
  this.candidateService.apply(payload).subscribe({
    next: (res) => {
      this.submitted = true;
      this.publicToken = res.publicToken;  // shown to candidate for tracking
    }
  });
}
```

After successful submission, shows the **tracking token** (e.g., `TRK-abc123`) which the candidate can use on the Track page.

---

#### `track.component.ts` — Track Application (`/track`)

3-step flow for candidates to check their application status without logging in:

```
Step 1: Enter email → request 6-digit verification code via email
Step 2: Enter the code → backend verifies and returns all applications for that email
Step 3: See list of applications with status badges
```

```typescript
// Step 1
requestTrackingCode(email) {
  this.candidateService.requestTrackingCode(email)
    .subscribe(() => this.step = 2);
}

// Step 2
verifyCode(email, code) {
  this.candidateService.verifyTrackingCode(email, code)
    .subscribe(res => {
      this.applications = res.applications;
      this.step = 3;
    });
}
```

---

#### `withdraw.component.ts` — Withdraw Application (`/withdraw/:token`)

GDPR self-service: allows a candidate to **permanently delete** their application and all associated data.

```
Shows:
- Application summary (job title, status, date applied)
- Warning consequences list:
  ✗ Your resume and personal data will be deleted
  ✗ Your application will be cancelled  
  ✗ This action is irreversible
- [Yes, Withdraw] [No, Keep]
```

```typescript
confirmWithdraw() {
  this.candidateService.withdraw(this.token)
    .subscribe(() => this.withdrawn = true);  // DELETE /api/candidates/withdraw/:token
}
```

---

#### `recommendation.component.ts` — Job Recommendations (`/recommendations`)

Candidate uploads their CV → AI analyzes it → suggests best matching jobs.

```typescript
getRecommendations() {
  this.candidateService.recommendJobPostings(this.resumeFile)
    .subscribe(res => {
      this.detectedSkills = res.detectedSkills;
      this.matches = res.matches;  // list of jobs with match% and missing skills
    });
}
```

Shows detected skills + top matching jobs with matched/missing skill pills.

---

## 9. 🛠️ Services — `app/services/`

Services are **injectable singletons** that handle all API calls and business logic. Components call services; services call the backend.

```
services/
├── auth.service.ts        ← Login, logout, token management
├── candidate.service.ts   ← All candidate operations (apply, track, HR CRUD, AI)
├── job-posting.service.ts ← Job posting CRUD + eval config
├── department.service.ts  ← Department CRUD + search
├── skill.service.ts       ← Skill CRUD + search
├── analytics.service.ts   ← Dashboard stats
└── i18n.service.ts        ← Translations (FR/EN)
```

---

### 9.1 `auth.service.ts` — Authentication

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_URL = 'http://localhost:1337/api';
  private currentUserSubject: BehaviorSubject<any>;  // reactive user state

  // Restores session from localStorage on page load
  constructor(private http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject(this.getUserFromLocalStorage());
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  login(credentials: { identifier: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/local`, credentials).pipe(
      tap(response => {
        localStorage.setItem('token', response.jwt);  // store JWT
        localStorage.setItem('user', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);  // notify all subscribers
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean { return !!localStorage.getItem('token'); }
  getToken(): string | null { return localStorage.getItem('token'); }
}
```

**Data stored in `localStorage`:**
- `token` → JWT (used by `TokenInterceptor`)
- `user` → `{ id, username, email }` (displayed in sidebar)

---

### 9.2 `candidate.service.ts` — All Candidate Operations

The largest service (~660 lines). Handles everything related to candidates:

```typescript
// ── PUBLIC (no auth needed) ──
apply(payload: ApplyPayload)      → POST /api/candidates/apply (multipart/form-data)
track(token)                       → GET  /api/candidates/track/:token
requestTrackingCode(email)         → POST /api/candidates/track/request-code
verifyTrackingCode(email, code)    → POST /api/candidates/track/verify-code
withdraw(token)                    → DELETE /api/candidates/withdraw/:token
recommendJobPostings(resume)       → POST /api/public/recommendations (multipart)
publicChat(messages)               → POST /api/public/chat

// ── HR (JWT required) ──
getAllHr(page, pageSize, sort, filters)   → GET /api/candidates/hr (paginated list)
getHrDetail(id)                          → GET /api/candidates/hr/:id (full detail)
updateStatus(id, status)                 → PUT /api/candidates/hr/:id/status
updateHrNotes(id, hrNotes)              → PUT /api/candidates/hr/:id/notes
bulkUpdateStatus(ids[], status)          → POST /api/candidates/hr/bulk-status

// ── AI / CV Features (HR) ──
getCvPreview(id, templateKey)            → GET /api/candidates/:id/cv-preview
getCvPdfDownloadUrl(id, token, key)      → URL string for PDF download
updateCvTemplate(id, templateKey)        → PUT /api/candidates/:id/template
reprocess(id)                            → PUT /api/candidates/:id/reprocess
triggerProcess(id)                       → POST /api/candidates/:id/process

// ── CV Template management ──
getCvTemplates()                         → GET /api/cv-templates
getCvTemplatePreview(key)                → GET /api/cv-templates/preview?templateKey=...
getDefaultCvTemplate()                   → GET /api/cv-templates/default
setDefaultCvTemplate(key)                → PUT /api/cv-templates/default
```

**Application status lifecycle:**
```
new → processing → processed → reviewing → shortlisted → hired
                                         ↘ rejected
(error can happen at any stage)
```

**`ApplicationStatus` type:**
```typescript
type ApplicationStatus = 'new' | 'processing' | 'processed' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired' | 'error';
```

**Key interfaces:**
```typescript
interface CandidateDetail {
  documentId: string;
  fullName: string;
  email: string;
  linkedin: string | null;
  portfolio: string | null;
  country?: string | null;
  city?: string | null;
  selfReportedYearsExperience: number | null;
  status: string;
  score: number;
  hrNotes: string | null;
  resume: CandidateResume | null;
  extractedData?: ExtractedData;   // AI-parsed CV content
  standardizedCvMarkdown?: string; // AI-generated CV in Markdown
  cvTemplateKey?: CvTemplateKey;   // which template to render
}

interface ExtractedData {
  contact: { fullName, email, phone, location, linkedin, portfolio, links[] };
  summary?: string;
  skills: string[];
  competencies: string[];
  languages: string[];
  experience: Array<{ company, title, startDate, endDate, highlights[] }>;
  education: Array<{ school, degree, startDate, endDate }>;
  certifications: string[];
  projects: Array<{ name, description, links[] }>;
}
```

---

### 9.3 `job-posting.service.ts` — Job Postings CRUD

```typescript
getAll()                    → GET /api/job-postings
getPublicJobs()             → GET /api/job-postings/public  (only status=open)
getOne(documentId)          → GET /api/job-postings/:id
create(payload)             → POST /api/job-postings
update(documentId, payload) → PUT /api/job-postings/:id
delete(documentId)          → DELETE /api/job-postings/:id
changeStatus(id, status)    → PUT /api/job-postings/:id/status
getCandidateCount(id)       → GET /api/candidates/by-job/:id?pagination[pageSize]=0
getEvalConfig(id)           → GET /api/hr/job-postings/:id/eval-config
setEvalConfig(id, config)   → PUT /api/hr/job-postings/:id/eval-config
```

**Job Posting interface:**
```typescript
interface JobPosting {
  id: number;
  documentId: string;
  title: string;
  description: string;
  status: 'draft' | 'open' | 'closed';
  requirements: Requirements | null;
  createdAt: string;
  updatedAt: string;
}

interface Requirements {
  skillsRequired: string[];     // must-have skill names
  skillsNiceToHave: string[];   // bonus skill names
  departments: string[];         // department names
  minYearsExperience: number | null;
  notes: string;                 // free text with "Location: X", "Type: Y" tags
  evaluationConfig?: EvaluationConfig;
}
```

---

### 9.4 `department.service.ts` — Department CRUD

```typescript
getAll()                → GET /api/departments
create(name)            → POST /api/departments  { data: { name } }
update(documentId, name)→ PUT /api/departments/:id
delete(documentId)      → DELETE /api/departments/:id
search(q, limit)        → GET /api/departments/search?q=<term>&limit=<n>
```

---

### 9.5 `skill.service.ts` — Skill CRUD

```typescript
getAll()                → GET /api/skills
search(q, limit)        → GET /api/skills/search?q=<term>&limit=<n>
create(name)            → POST /api/skills  { data: { name } }
update(documentId, name)→ PUT /api/skills/:id
delete(documentId)      → DELETE /api/skills/:id
```

---

### 9.6 `analytics.service.ts` — Dashboard Analytics

```typescript
getAnalytics() → GET /api/hr/analytics

// Response shape:
interface AnalyticsResponse {
  totals: { candidates: number; jobs: number; openJobs: number; };
  statusCounts: Record<string, number>;           // { "new": 12, "reviewing": 5, ... }
  scoreBuckets: Array<{ label, min, max, count }>; // score distribution
  monthlyApplications: Array<{ month, count }>;   // applications per month
}
```

---

### 9.7 `i18n.service.ts` — Translations (FR / EN)

The app fully supports **French and English** with a custom translation service (no external library).

```typescript
@Injectable({ providedIn: 'root' })
export class I18nService {
  lang: Lang = 'fr';  // default language
  lang$: Observable<Lang>;  // observable for components that react to language changes

  // Translate a key
  t(key: string): string {
    return TRANSLATIONS[key]?.[this.lang] ?? key;
  }

  // Toggle between FR and EN
  toggle(): void {
    this.lang = this.lang === 'fr' ? 'en' : 'fr';
    // Saves preference to localStorage separately for 'public' and 'hr' scopes
  }

  // Automatically switch scope based on current route
  setScope(scope: 'public' | 'hr'): void {
    // Loads last used language for this scope from localStorage
  }
}
```

**Two separate language preferences:**
- `iohire_lang_public` → saved language for public pages
- `iohire_lang_hr` → saved language for HR pages

**How to use in templates:**
```html
{{ i18n.t('nav.dashboard') }}       → "Dashboard" or "Tableau de bord"
{{ i18n.t('jobs.statusOpen') }}     → "Open" or "Ouverte"
{{ i18n.t('apply.resume') }}        → "Resume" or "CV"
```

**How to use in TypeScript:**
```typescript
constructor(public i18n: I18nService) {}

// In a method
this.error = this.i18n.t('candidateList.error.load');
```

**Language toggle switch (in navbar and sidebar):**
```html
<div class="lang-toggle" (click)="i18n.toggle()" [class.en]="i18n.lang === 'en'">
  <span class="lang-label" [class.active]="i18n.lang === 'fr'">FR</span>
  <span class="lang-slider"></span>
  <span class="lang-label" [class.active]="i18n.lang === 'en'">EN</span>
</div>
```

---

## 10. 📐 Data Flow Summary

```
User Action
    ↓
Component (page or reusable widget)
    ↓
Service Method
    ↓
TokenInterceptor adds JWT header
    ↓
HTTP Request → Strapi Backend (localhost:1337)
    ↓
Response comes back
    ↓
Observable.subscribe() in Component
    ↓
Component updates its local state
    ↓
Angular's change detection re-renders the template
```

---

## 11. 🗺️ User Journey Map

### Journey A: Candidate Applies for a Job
```
/ (home)
  → /jobs (browse open positions)
    → /jobs/:id/apply (fill form, upload CV)
      → Success! token shown
        → /track (check status by email + OTP code)
          → /withdraw/:token (optionally remove data)
```

### Journey B: HR Manager Reviews Candidates
```
/login (sign in)
  → /dashboard (overview stats)
    → /job-postings (see all jobs)
      → /job-postings/new (create new job)
        → /candidates (see who applied)
          → /candidates/:id (review a candidate, update status, add notes)
            → /cv-templates (change CV template style)
              → /ai-evaluation (tune scoring algorithm)
                → /analytics (see trends)
```

---

## 12. 🔑 Key Angular Concepts Used

| Concept | Where Used | What It Does |
|---------|-----------|-------------|
| `standalone: true` | All components | No NgModule needed |
| `@Input()` | Autocomplete, LocationMap, RevealOnScroll | Passes data into a component |
| `@Output() EventEmitter` | Autocomplete components | Fires events to parent component |
| `@HostListener` | ChatWidget, HomePageComponent | Listens to browser events (scroll, resize, click) |
| `BehaviorSubject` | AuthService, I18nService | Reactive state shared across components |
| `debounceTime + switchMap` | Autocomplete components | Prevents API spam on every keystroke |
| `*ngIf` / `*ngFor` | All templates | Conditional rendering / list rendering |
| `| async` | app.html (user$ pipe) | Auto-subscribes to Observable in template |
| `[class.active]` | NavLinks, LangToggle | Conditionally adds a CSS class |
| `[style.width.%]` | Dashboard bar charts | Inline style binding |
| `routerLink` | Navigation links | Client-side navigation (no page reload) |
| `routerLinkActive` | Sidebar nav | Adds 'active' class to current route link |
| `ActivatedRoute` | CandidateDetail, Track, Withdraw | Reads `:id` from URL params |
| `ReactiveFormsModule` | Login, ApplyComponent | Type-safe form validation |
| `FormsModule` | CandidatesList, Chat | Two-way binding with `[(ngModel)]` |

---

## 13. 🎨 Styling Conventions

- **All styles are component-scoped** (except `styles.scss` globals).
- Most components define styles inline using the `styles: [...]` array in the `@Component` decorator.
- The `departments`, `home-page`, and `login` pages use separate `.scss` files.
- **Color scheme:** Dark red `#8b1f1f` / `#791212` as the brand color throughout.
- **CSS variables** used in larger components (e.g., `--accent`, `--border`, `--text`) for consistency.
- **Animations:** `fadeInUp`, `shimmer` (skeleton loading), `slide-in/out` (job card pagination) defined as CSS `@keyframes`.

---

## 14. 🛡️ TypeScript Types at a Glance

```
src/types/chartjs.d.ts      → Ambient declaration for Chart.js (fixes TypeScript)

app/services/candidate.service.ts exports:
  ApplyPayload, ApplyResponse, TrackResponse, TrackingApplication,
  WithdrawResponse, CandidateDetail, CandidateListItem, AnalyticsCandidate,
  HrListResponse, StatusUpdateResponse, HrNotesUpdateResponse, BulkStatusResponse,
  ExtractedData, CvTemplateMeta, CvPreviewResponse, CvTemplateKey, ApplicationStatus

app/services/job-posting.service.ts exports:
  Requirements, EvaluationConfig, CompletenessPointsConfig, CustomCriterion,
  QualityThresholds, JobPosting, JobPostingPayload

app/services/auth.service.ts exports:
  LoginRequest, AuthResponse

app/services/department.service.ts exports:
  Department

app/services/skill.service.ts exports:
  Skill
```

---

> **Bottom line:** The frontend is a well-structured Angular 18 SPA with a clear split between the public candidate portal and the private HR dashboard. All components are standalone, all API calls go through typed services, authentication is handled with JWT stored in `localStorage`, every HTTP request is intercepted to attach the token, and every private route is protected by the `authGuard`. The `I18nService` handles FR/EN translations without any third-party i18n library.
