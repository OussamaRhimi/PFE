import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <div class="welcome-card">
        <h2>Welcome to Dashboard</h2>
        <div *ngIf="authService.currentUser$ | async as user" class="user-details">
          <p><strong>Username:</strong> {{ user.username }}</p>
          <p><strong>Email:</strong> {{ user.email }}</p>
          <p><strong>User ID:</strong> {{ user.id }}</p>
        </div>
        <p class="info-text">You are successfully authenticated!</p>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        padding: 2rem;
        max-width: 800px;
        margin: 0 auto;
      }

      .welcome-card {
        background: white;
        border-radius: 8px;
        padding: 2rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

        h2 {
          color: #667eea;
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
    `,
  ],
})
export class DashboardComponent {
  constructor(public authService: AuthService) {}
}
