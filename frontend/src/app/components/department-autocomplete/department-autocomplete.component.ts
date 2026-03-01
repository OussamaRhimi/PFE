import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { DepartmentService, Department } from '../../services/department.service';

@Component({
    selector: 'app-department-autocomplete',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="search-input-wrapper">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        type="text"
        [(ngModel)]="query"
        (ngModelChange)="onSearchChange($event)"
        (keydown)="onKeyDown($event)"
        (focus)="onInputFocus()"
        [placeholder]="placeholder"
        class="search-input"
        autocomplete="off"
      />
      <button class="clear-btn" *ngIf="query" (click)="clearSearch()">&times;</button>

      <!-- Dropdown suggestions -->
      <div class="autocomplete-dropdown" *ngIf="showDropdown && suggestions.length > 0">
        <div
          class="autocomplete-item"
          *ngFor="let d of suggestions; let i = index"
          [class.active]="i === activeIndex"
          (mousedown)="selectSuggestion(d)"
          (mouseover)="activeIndex = i"
          [innerHTML]="highlight(d.name, query)"
        ></div>
      </div>

      <!-- No results -->
      <div class="autocomplete-dropdown no-results"
           *ngIf="showDropdown && suggestions.length === 0 && query.trim().length > 0 && !isSearching">
        <div class="autocomplete-item disabled">Aucun département trouvé</div>
      </div>

      <span class="search-hint" *ngIf="isSearching">Recherche…</span>
    </div>
  `,
    styles: [`
    .search-input-wrapper {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
      width: 100%;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      color: #9ca3af;
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      padding: 10px 36px 10px 38px;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      color: #1f2937;
      outline: none;
      background: #f9fafb;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }
    .search-input:focus {
      border-color: #e6331a;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(230, 51, 26, 0.10);
    }
    .clear-btn {
      position: absolute; right: 10px;
      background: none; border: none;
      font-size: 18px; color: #9ca3af;
      cursor: pointer; line-height: 1;
      padding: 0 2px;
    }
    .clear-btn:hover { color: #e6331a; }
    .search-hint {
      position: absolute;
      right: -90px;
      font-size: 13px; color: #9ca3af; white-space: nowrap;
    }
    .autocomplete-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0; right: 0;
      background: #fff;
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      z-index: 1000;
      max-height: 240px;
      overflow-y: auto;
    }
    .autocomplete-item {
      padding: 10px 14px;
      font-size: 14px;
      color: #374151;
      cursor: pointer;
      border-bottom: 1px solid #f3f4f6;
      transition: background 0.12s;
    }
    .autocomplete-item:last-child { border-bottom: none; }
    .autocomplete-item:hover,
    .autocomplete-item.active {
      background: #fef2f0;
      color: #c0391b;
    }
    .autocomplete-item.disabled {
      color: #9ca3af; cursor: default; font-style: italic;
    }
    .autocomplete-item.disabled:hover { background: #fff; color: #9ca3af; }
    :host ::ng-deep .highlight {
      background: rgba(230, 51, 26, 0.12);
      color: #c0391b;
      font-weight: 700;
      border-radius: 2px;
      padding: 0 1px;
    }
  `]
})
export class DepartmentAutocompleteComponent implements OnInit, OnDestroy {
    @Input() placeholder = 'Rechercher un département...';
    @Input() set initialValue(val: string) { this.query = val || ''; }

    @Output() departmentSelected = new EventEmitter<Department>();
    @Output() searchResults = new EventEmitter<Department[]>();
    @Output() searchCleared = new EventEmitter<void>();
    @Output() queryChange = new EventEmitter<string>();

    query = '';
    suggestions: Department[] = [];
    showDropdown = false;
    activeIndex = -1;
    isSearching = false;

    private searchSubject = new Subject<string>();
    private subs = new Subscription();

    constructor(private departmentService: DepartmentService, private elRef: ElementRef) { }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.elRef.nativeElement.contains(event.target)) {
            this.showDropdown = false;
        }
    }

    ngOnInit(): void {
        const sub = this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            filter(q => q.trim().length > 0),
            switchMap(q => {
                this.isSearching = true;
                this.showDropdown = true;
                return this.departmentService.search(q, 20);
            })
        ).subscribe({
            next: (results) => {
                this.suggestions = results;
                this.searchResults.emit(results);
                this.isSearching = false;
                this.activeIndex = -1;
            },
            error: () => {
                this.isSearching = false;
                this.showDropdown = false;
            }
        });
        this.subs.add(sub);
    }

    ngOnDestroy(): void { this.subs.unsubscribe(); }

    onInputFocus(): void {
        if (this.query.trim().length > 0 && this.suggestions.length > 0) {
            this.showDropdown = true;
        }
    }

    onSearchChange(q: string): void {
        this.activeIndex = -1;
        this.queryChange.emit(q);
        if (!q.trim()) {
            this.suggestions = [];
            this.searchResults.emit([]);
            this.showDropdown = false;
            this.isSearching = false;
            return;
        }
        this.showDropdown = true;
        this.searchSubject.next(q);
    }

    onKeyDown(event: KeyboardEvent): void {
        if (!this.showDropdown || this.suggestions.length === 0) return;
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.activeIndex = Math.min(this.activeIndex + 1, this.suggestions.length - 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.activeIndex = Math.max(this.activeIndex - 1, -1);
                break;
            case 'Enter':
                if (this.activeIndex >= 0) {
                    event.preventDefault();
                    this.selectSuggestion(this.suggestions[this.activeIndex]);
                }
                break;
            case 'Escape':
                this.showDropdown = false;
                this.activeIndex = -1;
                break;
        }
    }

    selectSuggestion(dept: Department): void {
        this.query = dept.name;
        this.suggestions = [dept];
        this.searchResults.emit([dept]);
        this.departmentSelected.emit(dept);
        this.showDropdown = false;
        this.activeIndex = -1;
    }

    clearSearch(): void {
        this.query = '';
        this.suggestions = [];
        this.showDropdown = false;
        this.activeIndex = -1;
        this.isSearching = false;
        this.searchResults.emit([]);
        this.searchCleared.emit();
    }

    highlight(text: string, query: string): string {
        if (!query) return text;
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`(${escaped})`, 'gi'), '<span class="highlight">$1</span>');
    }
}
