import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CandidateService } from '../../services/candidate.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';

@Component({
  selector: 'app-candidate-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './candidate-detail.html',
  styleUrls: ['./candidate-detail.scss']
})
export class CandidateDetail implements OnInit {
  candidate: any;
  baseUrl = 'http://localhost:1337';
  statusOptions = ['new', 'processing', 'reviewing', 'processed', 'shortlisted', 'rejected', 'hired', 'error'];
  pendingStatus = '';
  statusDialogOpen = false;
  statusMessage = '';
  statusError = '';

  notesDraft = '';
  notesSaving = false;
  notesMessage = '';
  notesError = '';

  constructor(
    private route: ActivatedRoute,
    private candidateService: CandidateService,
    private location: Location
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.candidateService.getCandidateById(id).subscribe({
        next: (res: any) => {
          this.candidate = res.data;
          this.statusMessage = '';
          this.statusError = '';
          this.notesMessage = '';
          this.notesError = '';
          this.notesDraft = this.currentHrNotes;
        },
        error: () => {
          alert('Candidate not found or not published.');
        }
      });
    }
  }

  goBack() {
    this.location.back();
  }

  get jobTitle(): string {
    const c = this.candidate;
    return (
      c?.attributes?.job_posting?.data?.attributes?.title ??
      c?.attributes?.job_posting?.data?.title ??
      c?.attributes?.jobPosting?.data?.attributes?.title ??
      c?.job_posting?.title ??
      c?.jobPosting?.title ??
      c?.jobPosting?.data?.attributes?.title ??
      ''
    );
  }

  get currentStatus(): string {
    return this.candidate?.attributes?.status ?? this.candidate?.status ?? 'new';
  }

  get currentHrNotes(): string {
    return this.candidate?.attributes?.hrNotes ?? this.candidate?.hrNotes ?? '';
  }

  onStatusChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    if (!value || value === this.currentStatus) return;
    this.pendingStatus = value;
    this.statusDialogOpen = true;
  }

  cancelStatusChange() {
    this.pendingStatus = '';
    this.statusDialogOpen = false;
  }

  confirmStatusChange() {
    if (!this.candidate?.documentId || !this.pendingStatus) {
      this.cancelStatusChange();
      return;
    }

    this.statusError = '';
    this.statusMessage = '';
    const documentId = this.candidate.documentId;
    const newStatus = this.pendingStatus;

    this.candidateService.changeStatus(documentId, newStatus).subscribe({
      next: (res: any) => {
        const updated = res?.data ?? res;
        if (this.candidate?.attributes?.status != null) {
          this.candidate.attributes.status = updated?.attributes?.status ?? updated?.status ?? newStatus;
        } else {
          this.candidate.status = updated?.status ?? newStatus;
        }
        this.statusMessage = `Status updated: ${newStatus}`;
        this.cancelStatusChange();
      },
      error: (err) => {
        this.statusError = err?.error?.error?.message || 'Unable to change status.';
        this.cancelStatusChange();
      }
    });
  }

  saveNotes() {
    if (!this.candidate?.documentId) return;

    this.notesSaving = true;
    this.notesMessage = '';
    this.notesError = '';

    const documentId = this.candidate.documentId;
    const hrNotes = this.notesDraft || '';

    this.candidateService.updateHrNotes(documentId, hrNotes).subscribe({
      next: (res: any) => {
        const updated = res?.data ?? res;
        if (this.candidate?.attributes?.hrNotes != null) {
          this.candidate.attributes.hrNotes = updated?.attributes?.hrNotes ?? hrNotes;
        } else {
          this.candidate.hrNotes = updated?.hrNotes ?? hrNotes;
        }
        this.notesMessage = 'Notes saved.';
        this.notesSaving = false;
      },
      error: (err) => {
        this.notesError = err?.error?.error?.message || 'Unable to save notes.';
        this.notesSaving = false;
      }
    });
  }

  downloadResume() {
    const resumeAttr = this.candidate?.attributes?.resume?.data?.attributes;
    const directResume = this.candidate?.resume;
    const fileUrl = resumeAttr?.url || directResume?.url;
    const fileName =
      resumeAttr?.name ||
      directResume?.name ||
      `CV-${this.candidate?.attributes?.fullName || this.candidate?.fullName || 'candidat'}.pdf`;

    if (!fileUrl) {
      alert('Resume not available for this candidate.');
      return;
    }

    const absoluteUrl = this.baseUrl + fileUrl;

    fetch(absoluteUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => {
        alert('Download failed.');
      });
  }
}
