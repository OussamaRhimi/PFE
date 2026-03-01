import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SkillsComponent } from './pages/skills/skills.component';
import { authGuard } from './guards/auth.guard';
import { DepartmentsComponent } from './pages/departments/departments.component';
import { JobPostingsComponent } from './pages/job-postings/job-postings.component';
import { JobPostingFormComponent } from './pages/job-postings/job-posting-form.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
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
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];
