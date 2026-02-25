import { Component, EventEmitter, OnDestroy, Output, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { SkillService, Skill } from '../../services/skill.service';

@Component({
  selector: 'app-skills-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="autocomplete-container">
      <input
        type="text"
        [(ngModel)]="query"
        (ngModelChange)="onSearchChange($event)"
        placeholder="Rechercher une compétence (ex: Angular, Java...)"
        class="search-input"
        (focus)="showResults = true"
      />

      <ul class="results-list" *ngIf="showResults && results.length > 0">
        <li *ngFor="let skill of results" (click)="selectSkill(skill)">
          {{ skill.name }}
        </li>
      </ul>

      <div class="loading-hint" *ngIf="isSearching">Recherche en cours...</div>

      <div class="selected-skills" *ngIf="selectedSkills.length > 0">
        <span class="skill-chip" *ngFor="let s of selectedSkills">
          {{ s.name }}
          <button type="button" (click)="removeSkillFromSelection(s)">&times;</button>
        </span>
      </div>
    </div>
  `,
  styles: [`
    .autocomplete-container { position: relative; width: 100%; }
    .search-input {
      width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;
    }
    .results-list {
      position: absolute; top: 100%; left: 0; right: 0;
      background: white; border: 1px solid #ccc; border-top: none;
      z-index: 1000; list-style: none; padding: 0; margin: 0;
      max-height: 200px; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .results-list li { padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; }
    .results-list li:hover { background-color: #f0f4ff; color: #667eea; }
    
    /* Styles pour les badges (chips) */
    .selected-skills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .skill-chip {
      display: flex; align-items: center; background: #667eea; color: white;
      padding: 4px 10px; border-radius: 20px; font-size: 13px;
    }
    .skill-chip button {
      background: none; border: none; color: white; margin-left: 6px;
      cursor: pointer; font-size: 16px; line-height: 1;
    }
    .loading-hint { font-size: 12px; color: #888; margin-top: 4px; }
  `]
})
export class SkillsAutocompleteComponent implements OnDestroy {
  @Output() onSkillsChange = new EventEmitter<Skill[]>();

  query = '';
  results: Skill[] = [];
  selectedSkills: Skill[] = []; // Stocke les compétences choisies
  isSearching = false;
  showResults = false;

  private searchSubject = new Subject<string>();
  private sub: Subscription;

  constructor(private skillService: SkillService, private eRef: ElementRef) {
    this.sub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 2),
      switchMap(q => {
        this.isSearching = true;
        return this.skillService.search(q);
      })
    ).subscribe({
      next: (res) => {
        this.results = res;
        this.isSearching = false;
        this.showResults = true;
      },
      error: () => this.isSearching = false
    });
  }

  onSearchChange(q: string) {
    if (q.length < 2) {
      this.results = [];
      return;
    }
    this.searchSubject.next(q);
  }

  selectSkill(skill: Skill): void {
    // Évite les doublons
    if (!this.selectedSkills.find(s => s.documentId === skill.documentId)) {
      this.selectedSkills.push(skill);
      this.onSkillsChange.emit(this.selectedSkills);
    }
    this.clearSearch(); // Appel de la méthode de nettoyage
  }

  // MÉTHODE BIEN PLACÉE ICI
  clearSearch(): void {
    this.query = '';
    this.results = [];
    this.isSearching = false;
    this.showResults = false;
  }

  removeSkillFromSelection(skill: Skill): void {
    this.selectedSkills = this.selectedSkills.filter(s => s.documentId !== skill.documentId);
    this.onSkillsChange.emit(this.selectedSkills);
  }

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.showResults = false;
    }
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}