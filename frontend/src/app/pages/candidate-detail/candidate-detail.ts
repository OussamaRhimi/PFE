import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router'; // Import important !
import { CandidateService } from '../../services/candidate.service'; // Ajustez le chemin
import { CommonModule } from '@angular/common';

interface StrapiResponse {
  data: any;
  meta: any;
}

@Component({
  selector: 'app-candidate-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './candidate-detail.html',
  styleUrls: ['./candidate-detail.scss']
})
export class CandidateDetail implements OnInit {
  candidate: any;
  baseUrl = 'http://localhost:1337';

  // Ajoutez 'route' pour récupérer l'ID de l'URL
  constructor(
    private route: ActivatedRoute,
    private candidateService: CandidateService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    console.log("ID récupéré de l'URL :", id);

    if (id) {
      this.candidateService.getCandidateById(id).subscribe({
        next: (res: any) => {
          console.log('Candidat reçu :', res);
          this.candidate = res.data; // Vérifiez si c'est res.data ou res directement
        },
        error: (err) => {
          console.error('Détails de l\'erreur 404 :', err);
          alert("Le serveur Strapi dit que ce candidat n'existe pas ou n'est pas publié.");
        }
      });
    }
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

  downloadResume() {
    const resumeAttr = this.candidate?.attributes?.resume?.data?.attributes;
    const directResume = this.candidate?.resume;
    const fileUrl = resumeAttr?.url || directResume?.url;
    const fileName =
      resumeAttr?.name ||
      directResume?.name ||
      `CV-${this.candidate?.attributes?.fullName || this.candidate?.fullName || 'candidat'}.pdf`;

    if (!fileUrl) {
      alert("Le CV n'est pas disponible pour ce candidat.");
      return;
    }

    const absoluteUrl = this.baseUrl + fileUrl;

    // Force download (blob) to avoid opening in a new tab
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
        alert('Téléchargement impossible. Vérifiez que le fichier est accessible.');
      });
  }
}
