import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Lang = 'fr' | 'en';

const TRANSLATIONS: Record<string, Record<Lang, string>> = {
  // ── App Shell ──
  'nav.dashboard':       { fr: 'Tableau de bord', en: 'Dashboard' },
  'nav.skills':          { fr: 'Compétences',     en: 'Skills' },
  'nav.departments':     { fr: 'Départements',    en: 'Departments' },
  'nav.jobPostings':     { fr: 'Offres d\'emploi', en: 'Job Postings' },
  'nav.logout':          { fr: 'Déconnexion',     en: 'Logout' },

  // ── Login ──
  'login.welcomeTo':          { fr: 'Bienvenue sur',    en: 'Welcome to' },
  'login.subtitle':           { fr: 'Connectez-vous à votre espace professionnel', en: 'Sign in to your professional workspace' },
  'login.identifier':         { fr: 'Email ou nom d\'utilisateur', en: 'Email or username' },
  'login.identifierPlaceholder': { fr: 'Entrez votre identifiant', en: 'Enter your identifier' },
  'login.password':           { fr: 'Mot de passe',     en: 'Password' },
  'login.required':           { fr: 'Ce champ est requis', en: 'This field is required' },
  'login.minLength':          { fr: 'Minimum 6 caractères', en: 'Minimum 6 characters' },
  'login.rememberMe':         { fr: 'Se souvenir de moi', en: 'Remember me' },
  'login.forgotPassword':     { fr: 'Mot de passe oublié ?', en: 'Forgot password?' },
  'login.submit':             { fr: 'Se connecter',     en: 'Sign in' },
  'login.loading':            { fr: 'Connexion en cours…', en: 'Signing in…' },
  'login.or':                 { fr: 'ou',               en: 'or' },
  'login.newUser':            { fr: 'Nouveau sur IoHire ?', en: 'New to IoHire?' },
  'login.createAccount':      { fr: 'Créer un compte',  en: 'Create an account' },
  'login.failed':             { fr: 'Échec de connexion. Vérifiez vos identifiants.', en: 'Login failed. Please check your credentials.' },

  // ── Dashboard ──
  'dashboard.welcome':        { fr: 'Bienvenue sur IoHire', en: 'Welcome to IoHire' },
  'dashboard.subtitle':       { fr: 'Votre plateforme de recrutement intelligent', en: 'Your intelligent hiring platform' },
  'dashboard.user':           { fr: 'Utilisateur',      en: 'Username' },
  'dashboard.email':          { fr: 'Email',            en: 'Email' },
  'dashboard.quickAccess':    { fr: 'Accès rapide',     en: 'Quick Access' },
  'dashboard.skillsTitle':    { fr: 'Compétences',      en: 'Skills' },
  'dashboard.skillsDesc':     { fr: 'Gérer les compétences requises pour vos postes.', en: 'Manage skills required for your positions.' },
  'dashboard.deptTitle':      { fr: 'Départements',     en: 'Departments' },
  'dashboard.deptDesc':       { fr: 'Organiser et gérer vos départements.', en: 'Organize and manage your departments.' },
  'dashboard.jobsTitle':      { fr: 'Offres d\'emploi', en: 'Job Postings' },
  'dashboard.jobsDesc':       { fr: 'Créer et gérer vos offres de recrutement.', en: 'Create and manage your job openings.' },

  // ── Skills ──
  'skills.title':             { fr: 'Gestion des compétences', en: 'Skills Management' },
  'skills.backToDashboard':   { fr: '← Retour au tableau de bord', en: '← Back to Dashboard' },
  'skills.placeholder':       { fr: 'Nom de la compétence', en: 'Enter skill name' },
  'skills.add':               { fr: 'Ajouter',          en: 'Add' },
  'skills.searchPlaceholder': { fr: 'Rechercher une compétence...', en: 'Search skills...' },
  'skills.loading':           { fr: 'Chargement...',     en: 'Loading...' },
  'skills.noResults':         { fr: 'Aucune compétence trouvée pour', en: 'No skills found for' },
  'skills.empty':             { fr: 'Aucune compétence pour l\'instant. Ajoutez-en une ci-dessus.', en: 'No skills yet. Add one above.' },
  'skills.edit':              { fr: 'Modifier',          en: 'Edit' },
  'skills.delete':            { fr: 'Supprimer',         en: 'Delete' },
  'skills.save':              { fr: 'Sauvegarder',       en: 'Save' },
  'skills.cancel':            { fr: 'Annuler',           en: 'Cancel' },
  'skills.added':             { fr: 'ajoutée.',          en: 'added.' },
  'skills.addError':          { fr: 'Échec de l\'ajout. Le nom existe peut-être déjà.', en: 'Failed to add skill. It may already exist.' },
  'skills.updated':           { fr: 'Compétence mise à jour.', en: 'Skill updated.' },
  'skills.updateError':       { fr: 'Échec de la mise à jour.', en: 'Failed to update skill.' },
  'skills.deleteConfirm':     { fr: 'Supprimer', en: 'Delete' },
  'skills.deleted':           { fr: 'supprimée.', en: 'deleted.' },
  'skills.deleteError':       { fr: 'Échec de la suppression.', en: 'Failed to delete skill.' },
  'skills.loadError':         { fr: 'Échec du chargement des compétences.', en: 'Failed to load skills.' },
  'skills.result':            { fr: 'résultat', en: 'result' },
  'skills.results':           { fr: 'résultats', en: 'results' },

  // ── Departments ──
  'dept.title':               { fr: 'Gestion des départements', en: 'Departments Management' },
  'dept.backToDashboard':     { fr: '← Retour au tableau de bord', en: '← Back to Dashboard' },
  'dept.searchPlaceholder':   { fr: 'Rechercher un département...', en: 'Search departments...' },
  'dept.placeholder':         { fr: 'Nom du nouveau département', en: 'New department name' },
  'dept.add':                 { fr: 'Ajouter',           en: 'Add' },
  'dept.loading':             { fr: 'Chargement...',     en: 'Loading...' },
  'dept.empty':               { fr: 'Aucun département pour l\'instant.', en: 'No departments yet.' },
  'dept.noResults':           { fr: 'Aucun résultat pour votre recherche.', en: 'No results for your search.' },
  'dept.edit':                { fr: 'Modifier',          en: 'Edit' },
  'dept.delete':              { fr: 'Supprimer',         en: 'Delete' },
  'dept.save':                { fr: 'Sauvegarder',       en: 'Save' },
  'dept.cancel':              { fr: 'Annuler',           en: 'Cancel' },
  'dept.loadError':           { fr: 'Erreur lors du chargement des départements.', en: 'Failed to load departments.' },
  'dept.added':               { fr: 'Département ajouté.', en: 'Department added.' },
  'dept.addError':            { fr: 'Erreur à l\'ajout. Le nom existe peut-être déjà.', en: 'Failed to add. Name may already exist.' },
  'dept.updated':             { fr: 'Département mis à jour.', en: 'Department updated.' },
  'dept.updateError':         { fr: 'Erreur lors de la mise à jour.', en: 'Failed to update department.' },
  'dept.deleteConfirm':       { fr: 'Supprimer le département', en: 'Delete department' },
  'dept.deleted':             { fr: 'supprimé.', en: 'deleted.' },
  'dept.deleteError':         { fr: 'Erreur lors de la suppression.', en: 'Failed to delete department.' },

  // ── Job Postings List ──
  'jobs.title':               { fr: 'Offres d\'emploi',  en: 'Job Postings' },
  'jobs.new':                 { fr: '+ Nouvelle offre',   en: '+ New Job Posting' },
  'jobs.loading':             { fr: 'Chargement...',      en: 'Loading...' },
  'jobs.empty':               { fr: 'Aucune offre pour l\'instant.', en: 'No job postings yet.' },
  'jobs.colTitle':            { fr: 'Titre',              en: 'Title' },
  'jobs.colStatus':           { fr: 'Statut',             en: 'Status' },
  'jobs.colSkills':           { fr: 'Compétences requises', en: 'Skills Required' },
  'jobs.colDepts':            { fr: 'Départements',       en: 'Departments' },
  'jobs.colActions':          { fr: 'Actions',            en: 'Actions' },
  'jobs.open':                { fr: 'Ouvrir',             en: 'Open' },
  'jobs.close':               { fr: 'Fermer',             en: 'Close' },
  'jobs.reopen':              { fr: 'Rouvrir',            en: 'Reopen' },
  'jobs.confirmStatusTitle':  { fr: 'Confirmer le changement', en: 'Confirm Status Change' },
  'jobs.confirmStatusText':   { fr: 'Changer le statut de', en: 'Change status of' },
  'jobs.from':                { fr: 'de',                 en: 'from' },
  'jobs.to':                  { fr: 'à',                  en: 'to' },
  'jobs.confirm':             { fr: 'Confirmer',          en: 'Confirm' },
  'jobs.cancel':              { fr: 'Annuler',            en: 'Cancel' },
  'jobs.deleteTitle':         { fr: 'Supprimer l\'offre', en: 'Delete Job Posting' },
  'jobs.deleteText':          { fr: 'Êtes-vous sûr de vouloir supprimer', en: 'Are you sure you want to delete' },
  'jobs.cascadeWarning':      { fr: 'Cela supprimera aussi définitivement', en: 'This will also permanently delete' },
  'jobs.candidates':          { fr: 'candidat(s) et leurs fichiers CV.', en: 'candidate(s) and their resume files.' },
  'jobs.undoWarning':         { fr: 'Cette action est irréversible.', en: 'This action cannot be undone.' },
  'jobs.delete':              { fr: 'Supprimer',          en: 'Delete' },
  'jobs.statusChanged':       { fr: 'statut changé en',   en: 'status changed to' },
  'jobs.statusError':         { fr: 'Échec du changement de statut.', en: 'Failed to change status.' },
  'jobs.deleted':             { fr: 'supprimée.',         en: 'deleted.' },
  'jobs.deleteError':         { fr: 'Échec de la suppression.', en: 'Failed to delete job posting.' },
  'jobs.loadError':           { fr: 'Échec du chargement des offres.', en: 'Failed to load job postings.' },
  'jobs.editTooltip':         { fr: 'Modifier',           en: 'Edit' },
  'jobs.deleteTooltip':       { fr: 'Supprimer',          en: 'Delete' },

  // ── Job Posting Form ──
  'form.editTitle':           { fr: 'Modifier l\'offre',  en: 'Edit Job Posting' },
  'form.newTitle':            { fr: 'Nouvelle offre',      en: 'New Job Posting' },
  'form.backToList':          { fr: '← Retour à la liste', en: '← Back to list' },
  'form.titleLabel':          { fr: 'Titre *',            en: 'Title *' },
  'form.titlePlaceholder':    { fr: 'Titre du poste',     en: 'Job title' },
  'form.descLabel':           { fr: 'Description',        en: 'Description' },
  'form.descPlaceholder':     { fr: 'Description du poste...', en: 'Job description...' },
  'form.requirements':        { fr: 'Exigences',          en: 'Requirements' },
  'form.skillsRequired':      { fr: 'Compétences requises', en: 'Skills Required' },
  'form.addSkillRequired':    { fr: '— Ajouter une compétence requise —', en: '— Add a required skill —' },
  'form.skillsNice':          { fr: 'Compétences souhaitées', en: 'Skills Nice-to-Have' },
  'form.addSkillNice':        { fr: '— Ajouter une compétence souhaitée —', en: '— Add a nice-to-have skill —' },
  'form.departments':         { fr: 'Départements',       en: 'Departments' },
  'form.addDepartment':       { fr: '— Ajouter un département —', en: '— Add a department —' },
  'form.minYears':            { fr: 'Années d\'expérience min.', en: 'Min. Years of Experience' },
  'form.minYearsPlaceholder': { fr: 'ex. 3',              en: 'e.g. 3' },
  'form.notes':               { fr: 'Notes',              en: 'Notes' },
  'form.notesPlaceholder':    { fr: 'Notes supplémentaires...', en: 'Additional requirement notes...' },
  'form.saving':              { fr: 'Enregistrement...',   en: 'Saving...' },
  'form.update':              { fr: 'Mettre à jour',       en: 'Update' },
  'form.create':              { fr: 'Créer',               en: 'Create' },
  'form.cancel':              { fr: 'Annuler',             en: 'Cancel' },
  'form.loadError':           { fr: 'Erreur lors du chargement de l\'offre.', en: 'Failed to load job posting.' },
  'form.saveError':           { fr: 'Erreur lors de l\'enregistrement.', en: 'Failed to save job posting.' },
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private langSubject = new BehaviorSubject<Lang>(this.getStoredLang());
  lang$ = this.langSubject.asObservable();

  get lang(): Lang {
    return this.langSubject.value;
  }

  t(key: string): string {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    return entry[this.lang] || entry['en'] || key;
  }

  toggle(): void {
    const next: Lang = this.lang === 'fr' ? 'en' : 'fr';
    this.langSubject.next(next);
    localStorage.setItem('iohire_lang', next);
  }

  setLang(lang: Lang): void {
    this.langSubject.next(lang);
    localStorage.setItem('iohire_lang', lang);
  }

  private getStoredLang(): Lang {
    const stored = localStorage.getItem('iohire_lang');
    if (stored === 'en' || stored === 'fr') return stored;
    return 'fr'; // default French
  }
}
