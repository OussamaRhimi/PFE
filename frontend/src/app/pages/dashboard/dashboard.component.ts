import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container">
      <div class="welcome-card">
        <h2>Welcome to Dashboard</h2>
        <div *ngIf="authService.currentUser$ | async as user" class="user-details">
          <p><strong>Username:</strong> {{ user.username }}</p>
          <p><strong>Email:</strong> {{ user.email }}</p>
        </div>
        <p class="info-text">You are successfully authenticated!</p>
      </div>

      <div class="features-section">
        <h3>Quick Access</h3>
        <div class="features-grid">
          <div class="feature-card">
            <h4>Skills Management</h4>
            <p>Add, edit, and delete skills by name.</p>
            <a routerLink="/skills" class="btn btn-primary">Go to Skills</a>
          </div>
          <div class="feature-card">
            <h4>Departments Management</h4>
            <p>Manage departments: add, edit, delete.</p>
            <a routerLink="/departments" class="btn btn-primary">Go to Departments</a>
          </div>
          <div class="feature-card">
            <h4>Job Postings</h4>
            <p>Create and manage job openings.</p>
            <a routerLink="/job-postings" class="btn btn-primary">Go to Job Postings</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
      }

      .welcome-card {
        background: white;
        border-radius: 8px;
        padding: 2rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        margin-bottom: 2rem;

        h2 {
          color: #667eea;
          margin-top: 0;
          margin-bottom: 1.5rem;
        }

        .user-details {
          background: #f5f5f5;
          border-left: 4px solid #667eea;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;

          p {
            margin: 0.5rem 0;
            font-size: 14px;
          }
        }

        .info-text {
          color: #666;
          font-size: 14px;
          margin: 0;
        }
      }

      .features-section {
        h3 {
          color: #333;
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 1.25rem;
        }
      }

      .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
      }

      .feature-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;

        &:hover {
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        h4 {
          color: #333;
          margin-top: 0;
          margin-bottom: 0.5rem;
        }

        p {
          color: #666;
          font-size: 0.95rem;
          line-height: 1.5;
          margin-bottom: 1rem;
        }
      }

      .btn {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 500;
        text-decoration: none;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-1px);
        }
      }

      .btn-primary {
        background-color: #667eea;
        color: white;

        &:hover {
          background-color: #5568d3;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
      }

      @media (max-width: 768px) {
        .dashboard-container {
          padding: 1rem;
        }

        .features-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DashboardComponent {
  constructor(public authService: AuthService) {}
}