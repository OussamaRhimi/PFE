import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SkillsComponent } from './pages/skills/skills.component';
import { authGuard } from './guards/auth.guard';
import { DepartmentsComponent } from './pages/departments/departments.component';
import { JobPostingsComponent } from './pages/job-postings/job-postings.component';
import { JobPostingFormComponent } from './pages/job-postings/job-posting-form.component';
import { PublicJobListComponent } from './pages/public-jobs/public-job-list.component';
import { ApplyComponent } from './pages/public-jobs/apply.component';
import { TrackComponent } from './pages/public-jobs/track.component';
import { WithdrawComponent } from './pages/public-jobs/withdraw.component';
import { CandidatesListComponent } from './pages/candidates/candidates-list.component';
import { CandidateDetailComponent } from './pages/candidates/candidate-detail.component';

// ✅ Importation correcte selon votre fichier homepage.ts
import { HomePage } from './pages/public-jobs/homepage/homepage';

export const routes: Routes = [
  // 1. PAGE D'ACCUEIL : L'application s'ouvre ici par défaut
  {
    path: '',
    component: HomePage,
    pathMatch: 'full',
  },

  // 2. ROUTES PUBLIQUES
  {
    path: 'jobs',
    component: PublicJobListComponent,
  },
  {
    path: 'jobs/:jobId/apply',
    component: ApplyComponent,
  },
  {
    path: 'track',
    component: TrackComponent,
  },
  {
    path: 'withdraw/:token',
    component: WithdrawComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },

  // 3. ROUTES PRIVÉES (RH / ADMIN)
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'skills',
    component: SkillsComponent,
    canActivate: [authGuard],
  },
  {
    path: 'departments',
    component: DepartmentsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'job-postings',
    component: JobPostingsComponent,
    canActivate: [authGuard],
  },
  {
    path: 'job-postings/new',
    component: JobPostingFormComponent,
    canActivate: [authGuard],
  },
  {
    path: 'job-postings/:id/edit',
    component: JobPostingFormComponent,
    canActivate: [authGuard],
  },
  {
    path: 'candidates',
    component: CandidatesListComponent,
    canActivate: [authGuard],
  },
  {
    path: 'candidates/:id',
    component: CandidateDetailComponent,
    canActivate: [authGuard],
  },

  // 4. REDIRECTION SI L'URL N'EXISTE PAS
  {
    path: '**',
    redirectTo: '', // On retourne à la Home Page
  },
];