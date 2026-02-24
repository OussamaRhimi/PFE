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
      <div class="navbar">
        <div class="navbar-content">
          <h1 class="navbar-title">My App</h1>
          <div class="navbar-actions">
            <span class="user-name" *ngIf="authService.currentUser$ | async as user">
              {{ user.username }}
            </span>
            <button class="btn-logout" (click)="logout()">Logout</button>
          </div>
        </div>
      </div>

      <div class="sidebar">
        <nav class="nav-menu">
          <div class="nav-item active">
            <a href="#dashboard">Dashboard</a>
          </div>
          <div class="nav-item">
            <a routerLink="/skills" routerLinkActive="active">
              Skills Management
            </a>
          </div>
        </nav>
      </div>

      <div class="main-content">
        <div class="welcome-card">
          <h2>Welcome to Dashboard</h2>
          <div *ngIf="authService.currentUser$ | async as user" class="user-details">
            <p><strong>Username:</strong> {{ user.username }}</p>
            <p><strong>Email:</strong> {{ user.email }}</p>
            <p><strong>User ID:</strong> {{ user.id }}</p>
          </div>
          <p class="info-text">You are successfully authenticated!</p>
        </div>

        <div class="features-section">
          <h3>Available Features</h3>
          <div class="features-grid">
            <div class="feature-card">
              <h4>Skills Management</h4>
              <p>Add, edit, and delete skills by name.</p>
              <a routerLink="/skills" class="btn btn-primary">Go to Skills</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background-color: #f5f5f5;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      /* Navbar */
      .navbar {
        background-color: #667eea;
        color: white;
        padding: 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .navbar-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        max-width: 1400px;
        margin: 0 auto;
        width: 100%;
      }

      .navbar-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
      }

      .navbar-actions {
        display: flex;
        align-items: center;
        gap: 1.5rem;
      }

      .user-name {
        font-size: 0.95rem;
        opacity: 0.9;
      }

      .btn-logout {
        background-color: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.3s ease;

        &:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }
      }

      /* Layout */
      .sidebar {
        background-color: white;
        border-right: 1px solid #e0e0e0;
        width: 200px;
        padding: 1rem 0;
        display: none;

        @media (min-width: 1024px) {
          display: block;
        }
      }

      .nav-menu {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .nav-item {
        margin: 0;

        a {
          display: block;
          padding: 1rem 1.5rem;
          color: #666;
          text-decoration: none;
          transition: all 0.3s ease;
          border-left: 3px solid transparent;

          &:hover {
            background-color: #f5f5f5;
            color: #667eea;
          }
        }

        &.active a {
          color: #667eea;
          background-color: #f0f4ff;
          border-left-color: #667eea;
          font-weight: 500;
        }
      }

      .main-content {
        flex: 1;
        overflow-y: auto;
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
      }

      /* Welcome Card */
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

      /* Features Section */
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
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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

      /* Responsive */
      @media (max-width: 768px) {
        .dashboard-container {
          flex-direction: column;
        }

        .navbar-content {
          padding: 1rem;
        }

        .navbar-title {
          font-size: 1.25rem;
        }

        .navbar-actions {
          gap: 0.5rem;
        }

        .btn-logout {
          padding: 0.4rem 0.8rem;
          font-size: 0.8rem;
        }

        .main-content {
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

  logout(): void {
    this.authService.logout();
    window.location.href = '/login';
  }
}
