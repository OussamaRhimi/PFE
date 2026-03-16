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
  selectedJobId = signal<string>('');

  currentPage = 1;
  currentSort = 'fullName:asc';

  constructor(
    private candidateService: CandidateService,
    private jobService: JobPostingService, // <--- Injecter le service Job
    private route: ActivatedRoute,
    public i18n: I18nService,
    
  ) {}

  ngOnInit(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.selectedJobId.set(idFromUrl);
      this.loadJobTitle(idFromUrl); // <--- Charger le titre
      this.loadData();
    }
  }

  loadJobTitle(id: string): void {
  this.jobService.getOne(id).subscribe({
    next: (job) => {
      // ✅ Si tu as bien configuré ton service, le titre est direct
      this.jobTitle.set(job.title); 
    },
    error: () => this.jobTitle.set('Poste introuvable')
  });
}

loadData(): void {
  // On ajoute "as Observable<any>" pour lever la restriction de type
  (this.candidateService.getCandidatesByJob(this.selectedJobId(), this.currentPage, this.currentSort) as Observable<any>)
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

}
