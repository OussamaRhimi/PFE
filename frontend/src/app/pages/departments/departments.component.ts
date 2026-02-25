import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DepartmentService, Department } from '../../services/department.service';

@Component({
    selector: 'app-departments',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './departments.component.html',
    styleUrls: ['./departments.component.scss']
})
export class DepartmentsComponent implements OnInit {
    departments: Department[] = [];
    newName = '';
    editingId: string | null = null;
    editName = '';
    error = '';
    success = '';
    loading = false;

    constructor(private departmentService: DepartmentService) { }

    ngOnInit(): void {
        this.loadDepartments();
    }

    loadDepartments(): void {
        this.loading = true;
        this.departmentService.getAll().subscribe({
            next: (data) => {
                this.departments = data;
                this.loading = false;
            },
            error: (err) => {
                this.error = 'Erreur lors du chargement des départements.';
                console.error(err);
                this.loading = false;
            }
        });
    }

    addDepartment(): void {
        const name = this.newName.trim();
        if (!name) return;
        this.clearMessages();
        this.departmentService.create(name).subscribe({
            next: (dept) => {
                this.departments.push(dept);
                this.newName = '';
                this.success = `Département "${dept.name}" ajouté.`;
                this.autoClearSuccess();
            },
            error: (err) => {
                this.error = "Erreur à l'ajout. Le nom existe peut-être déjà.";
                console.error(err);
            }
        });
    }

    startEdit(dept: Department): void {
        this.editingId = dept.documentId;
        this.editName = dept.name;
        this.clearMessages();
    }

    cancelEdit(): void {
        this.editingId = null;
        this.editName = '';
    }

    saveEdit(): void {
        if (!this.editingId) return;
        const name = this.editName.trim();
        if (!name) return;
        this.clearMessages();
        this.departmentService.update(this.editingId, name).subscribe({
            next: (updated) => {
                const index = this.departments.findIndex(d => d.documentId === updated.documentId);
                if (index !== -1) this.departments[index] = updated;
                this.success = 'Département mis à jour.';
                this.cancelEdit();
                this.autoClearSuccess();
            },
            error: (err) => {
                this.error = 'Erreur lors de la mise à jour.';
                console.error(err);
            }
        });
    }

    deleteDepartment(dept: Department): void {
        if (!confirm(`Supprimer le département "${dept.name}" ?`)) return;
        this.clearMessages();
        this.departmentService.delete(dept.documentId).subscribe({
            next: () => {
                this.departments = this.departments.filter(d => d.documentId !== dept.documentId);
                this.success = `"${dept.name}" supprimé.`;
                this.autoClearSuccess();
            },
            error: (err) => {
                this.error = 'Erreur lors de la suppression.';
                console.error(err);
            }
        });
    }

    private clearMessages(): void {
        this.error = '';
        this.success = '';
    }

    private autoClearSuccess(): void {
        setTimeout(() => this.success = '', 3000);
    }
}