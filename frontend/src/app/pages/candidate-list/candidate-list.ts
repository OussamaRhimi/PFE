import { Component, OnInit, signal } from '@angular/core';
import { CandidateService, StrapiResponse } from '../../services/candidate.service';
import { CommonModule } from '@angular/common';
import { PageEvent } from '@angular/material/paginator'; 
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule , Sort  } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { JobPosting, JobPostingService } from '../../services/job-posting.service';
import { I18nService } from '../../services/i18n.service';
import { Observable } from 'rxjs/internal/Observable';
import { Router } from '@angular/router'; 
@Component({
  selector: 'app-candidate-list',
  standalone: true,
  imports: [CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule, RouterLink],
  templateUrl: './candidate-list.html',
  styleUrl: './candidate-list.scss',
})


export class CandidateList implements OnInit {
candidates = signal<any[]>([]);
  meta = signal<any>(null);
  
  // Signal pour stocker le titre du job
  jobTitle = signal<string>('Chargement...'); 
  selectedJobDocumentId = signal<string>('');

  currentPage = 1;
  currentSort = 'fullName:asc';

  constructor(
    private candidateService: CandidateService,
    private jobService: JobPostingService, // <--- Injecter le service Job
    private route: ActivatedRoute,
    public i18n: I18nService,
    private router: Router
    
  ) {}

  ngOnInit(): void {
    const documentId = this.route.snapshot.paramMap.get('id');
    if (documentId) {
      this.selectedJobDocumentId.set(documentId);
      this.loadJobTitle(documentId);
      this.loadData();
    }
  }

  loadJobTitle(documentId: string): void {
    this.jobService.getOne(documentId).subscribe({
      next: (job) => {
        this.jobTitle.set(job.title);
      },
      error: () => {
        this.jobTitle.set('Poste introuvable');
      }
    });
  }

loadData(): void {
  const documentId = this.selectedJobDocumentId();
  if (!documentId) return;

  // On ajoute "as Observable<any>" pour lever la restriction de type
  (this.candidateService.getCandidatesByJob(documentId, this.currentPage, this.currentSort) as Observable<any>)
    .subscribe({
      next: (response: StrapiResponse) => { 
        this.candidates.set(response.data);
        this.meta.set(response.meta.pagination);
      },
      error: (err) => console.error(err)
    });
}

  changePage(page: number): void {
    this.currentPage = page;
    this.loadData();
  }

  toggleSort(field: string): void {
    this.currentSort = this.currentSort.includes('asc') ? `${field}:desc` : `${field}:asc`;
    this.loadData();
  }


goToDetail(documentId: string) {
  // Navigation directe sans surcharge de directives HTML
  this.router.navigate(['/candidate-detail', documentId]);
}

}
