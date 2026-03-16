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
  'form.list':       { fr: 'Voir les candidats',          en: 'View Candidates' },
  // ── Public Job Listing ──
  'public.login':             { fr: 'Se connecter',            en: 'Sign in' },
  'public.navJobs':           { fr: 'Offres d\'emploi',        en: 'Job Openings' },
  'public.hero':              { fr: 'Offres d\'emploi ouvertes', en: 'Open Job Postings' },
  'public.heroSub':           { fr: 'Découvrez nos opportunités et rejoignez notre équipe.', en: 'Discover our opportunities and join our team.' },
  'public.searchPlaceholder': { fr: 'Rechercher par titre, compétence, département…', en: 'Search by title, skill, department…' },
  'public.loading':           { fr: 'Chargement…',             en: 'Loading…' },
  'public.loadError':         { fr: 'Impossible de charger les offres.', en: 'Failed to load job postings.' },
  'public.empty':             { fr: 'Aucune offre ouverte pour le moment.', en: 'No open positions at the moment.' },
  'public.open':              { fr: 'Ouvert',                  en: 'Open' },
  'public.yearsExp':          { fr: 'ans d\'expérience',       en: 'years experience' },
  'public.result':            { fr: 'résultat',                en: 'result' },
  'public.results':           { fr: 'résultats',               en: 'results' },
  'public.footer':            { fr: 'Plateforme de recrutement intelligent', en: 'Intelligent Hiring Platform' },
  'public.applyNow':          { fr: 'Postuler',                 en: 'Apply Now' },
  'public.trackApp':          { fr: 'Suivi de candidature',     en: 'Track Application' },

  // ── Apply Form (US2 + US3) ──
  'apply.title':              { fr: 'Postuler à cette offre',   en: 'Apply for this position' },
  'apply.loadingJob':         { fr: 'Chargement de l\'offre…',  en: 'Loading job posting…' },
  'apply.noJob':              { fr: 'Aucun identifiant d\'offre fourni.', en: 'No job posting ID provided.' },
  'apply.jobClosed':          { fr: 'Cette offre n\'est plus ouverte aux candidatures.', en: 'This job posting is no longer accepting applications.' },
  'apply.jobNotFound':        { fr: 'Offre introuvable.',       en: 'Job posting not found.' },
  'apply.fullName':           { fr: 'Nom complet',              en: 'Full Name' },
  'apply.fullNamePh':         { fr: 'Prénom et nom',            en: 'First and last name' },
  'apply.email':              { fr: 'Email',                    en: 'Email' },
  'apply.emailPh':            { fr: 'votre@email.com',          en: 'your@email.com' },
  'apply.invalidEmail':       { fr: 'Adresse email invalide.',  en: 'Invalid email address.' },
  'apply.linkedin':           { fr: 'LinkedIn',                 en: 'LinkedIn' },
  'apply.linkedinPh':         { fr: 'https://linkedin.com/in/…', en: 'https://linkedin.com/in/…' },
  'apply.portfolio':          { fr: 'Portfolio / Site web',      en: 'Portfolio / Website' },
  'apply.portfolioPh':        { fr: 'https://…',                en: 'https://…' },
  'apply.yearsExp':           { fr: 'Années d\'expérience',     en: 'Years of Experience' },
  'apply.yearsExpPh':         { fr: 'ex. 3',                    en: 'e.g. 3' },
  'apply.candidateNotes':     { fr: 'Notes (optionnel)',        en: 'Notes (optional)' },
  'apply.candidateNotesPh':   { fr: 'Présentez-vous brièvement…', en: 'Tell us about yourself…' },
  'apply.resume':             { fr: 'CV',                       en: 'Resume' },
  'apply.chooseFile':         { fr: 'Cliquez ou glissez votre CV ici', en: 'Click or drag your resume here' },
  'apply.fileHint':           { fr: 'PDF, DOC ou DOCX — 5 Mo maximum', en: 'PDF, DOC, or DOCX — 5 MB max' },
  'apply.fileTypeError':      { fr: 'Format non supporté. Utilisez PDF, DOC ou DOCX.', en: 'Unsupported format. Use PDF, DOC, or DOCX.' },
  'apply.fileSizeError':      { fr: 'Le fichier dépasse la limite de 5 Mo.', en: 'File exceeds the 5 MB limit.' },
  'apply.required':           { fr: 'Ce champ est requis.',     en: 'This field is required.' },
  'apply.gdprTitle':          { fr: 'Protection des données',   en: 'Data Protection' },
  'apply.gdprText':           { fr: 'Vos données personnelles seront conservées pendant 24 mois conformément au RGPD. Vous pouvez demander leur suppression à tout moment via votre jeton de suivi.', en: 'Your personal data will be retained for 24 months in compliance with GDPR. You can request deletion at any time using your tracking token.' },
  'apply.consentLabel':       { fr: 'J\'accepte le traitement de mes données personnelles aux fins de ce recrutement.', en: 'I consent to the processing of my personal data for this recruitment.' },
  'apply.consentRequired':    { fr: 'Vous devez accepter le traitement des données pour postuler.', en: 'You must consent to data processing to apply.' },
  'apply.submitting':         { fr: 'Envoi en cours…',          en: 'Submitting…' },
  'apply.submit':             { fr: 'Envoyer ma candidature',   en: 'Submit Application' },
  'apply.cancel':             { fr: 'Annuler',                  en: 'Cancel' },
  'apply.submitError':        { fr: 'Erreur lors de l\'envoi. Veuillez réessayer.', en: 'Submission failed. Please try again.' },
  'apply.successTitle':       { fr: 'Candidature envoyée !',    en: 'Application Submitted!' },
  'apply.successText':        { fr: 'Votre candidature a bien été enregistrée. Conservez votre jeton pour suivre votre candidature.', en: 'Your application has been recorded. Save your tracking token to follow up.' },
  'apply.tokenLabel':         { fr: 'Jeton de suivi',           en: 'Tracking Token' },
  'apply.tokenWarning':       { fr: '⚠ Conservez ce jeton précieusement. Il est nécessaire pour suivre ou retirer votre candidature.', en: '⚠ Save this token carefully. It is needed to track or withdraw your application.' },
  'apply.copy':               { fr: 'Copier',                   en: 'Copy' },
  'apply.backToJobs':         { fr: '← Retour aux offres',      en: '← Back to Jobs' },
  'apply.trackNow':           { fr: 'Suivre ma candidature →',  en: 'Track My Application →' },

  // ── Track (US4) ──
  'track.title':              { fr: 'Suivi de candidature',     en: 'Track Your Application' },
  'track.subtitle':           { fr: 'Suivez votre candidature en 3 étapes: email, code de vérification, puis liste de vos candidatures.', en: 'Track your applications in 3 steps: email, verification code, then your applications list.' },
  'track.stepEmailTitle':     { fr: 'Étape 1 - Entrez votre email', en: 'Step 1 - Enter your email' },
  'track.stepEmailText':      { fr: 'Nous vous enverrons un code de vérification à 6 chiffres.', en: 'We will send you a 6-digit verification code.' },
  'track.emailPh':            { fr: 'votre.email@exemple.com',  en: 'your.email@example.com' },
  'track.sendCode':           { fr: 'Envoyer le code',          en: 'Send Code' },
  'track.sendingCode':        { fr: 'Envoi…',                   en: 'Sending…' },
  'track.codeSent':           { fr: 'Si votre email existe dans notre système, un code a été envoyé.', en: 'If your email exists in our system, a code has been sent.' },
  'track.sendFailed':         { fr: 'Impossible d\'envoyer le code pour le moment.', en: 'Unable to send code at the moment.' },
  'track.stepCodeTitle':      { fr: 'Étape 2 - Vérifiez le code', en: 'Step 2 - Verify the code' },
  'track.stepCodeText':       { fr: 'Entrez le code reçu par email pour afficher vos candidatures.', en: 'Enter the email code to display your applications.' },
  'track.codePh':             { fr: 'Code à 6 chiffres',        en: '6-digit code' },
  'track.verifyCode':         { fr: 'Vérifier',                 en: 'Verify' },
  'track.verifying':          { fr: 'Vérification…',            en: 'Verifying…' },
  'track.invalidCode':        { fr: 'Code invalide ou expiré.', en: 'Invalid or expired code.' },
  'track.changeEmail':        { fr: 'Changer d\'email',         en: 'Change email' },
  'track.resendCode':         { fr: 'Renvoyer le code',         en: 'Resend code' },
  'track.stepListTitle':      { fr: 'Étape 3 - Vos candidatures', en: 'Step 3 - Your applications' },
  'track.resultsFor':         { fr: 'Résultats pour',           en: 'Results for' },
  'track.emptyList':          { fr: 'Aucune candidature trouvée pour cet email.', en: 'No applications found for this email.' },
  'track.unknownJob':         { fr: 'Poste non spécifié',       en: 'Unspecified position' },
  'track.jobTitle':           { fr: 'Poste',                    en: 'Position' },
  'track.appliedAt':          { fr: 'Date de candidature',      en: 'Applied on' },
  'track.retentionUntil':     { fr: 'Données conservées jusqu\'au', en: 'Data retained until' },
  'track.newSearch':          { fr: 'Nouvelle recherche',       en: 'New Search' },
  'track.withdraw':           { fr: 'Retirer ma candidature',   en: 'Withdraw Application' },
  'track.status_new':         { fr: 'Nouvelle',                 en: 'New' },
  'track.status_processing':  { fr: 'En traitement',            en: 'Processing' },
  'track.status_processed':   { fr: 'Traitée',                  en: 'Processed' },
  'track.status_reviewing':   { fr: 'En révision',              en: 'Reviewing' },
  'track.status_shortlisted': { fr: 'Présélectionnée',          en: 'Shortlisted' },
  'track.status_rejected':    { fr: 'Refusée',                  en: 'Rejected' },
  'track.status_hired':       { fr: 'Recrutée',                 en: 'Hired' },
  'track.status_error':       { fr: 'Erreur',                   en: 'Error' },

  // ── Withdraw (US5) ──
  'withdraw.title':           { fr: 'Retirer ma candidature',   en: 'Withdraw Application' },
  'withdraw.subtitle':        { fr: 'Cette action supprimera définitivement votre candidature et vos données personnelles.', en: 'This will permanently delete your application and personal data.' },
  'withdraw.loading':         { fr: 'Chargement…',              en: 'Loading…' },
  'withdraw.noToken':         { fr: 'Aucun jeton fourni.',      en: 'No token provided.' },
  'withdraw.notFound':        { fr: 'Candidature introuvable ou déjà supprimée.', en: 'Application not found or already deleted.' },
  'withdraw.goTrack':         { fr: '← Retour au suivi',        en: '← Back to tracking' },
  'withdraw.jobLabel':        { fr: 'Poste',                    en: 'Position' },
  'withdraw.statusLabel':     { fr: 'Statut',                   en: 'Status' },
  'withdraw.appliedLabel':    { fr: 'Candidature du',           en: 'Applied on' },
  'withdraw.consequences':    { fr: 'Cette action entraînera :',en: 'This action will:' },
  'withdraw.consequence1':    { fr: 'La suppression de votre CV et de vos données personnelles', en: 'Delete your resume and personal data' },
  'withdraw.consequence2':    { fr: 'L\'annulation de votre candidature', en: 'Cancel your application' },
  'withdraw.consequence3':    { fr: 'Cette action est irréversible', en: 'This action is irreversible' },
  'withdraw.confirm':         { fr: 'Oui, retirer ma candidature', en: 'Yes, Withdraw My Application' },
  'withdraw.deleting':        { fr: 'Suppression…',             en: 'Deleting…' },
  'withdraw.cancel':          { fr: 'Non, garder ma candidature', en: 'No, Keep My Application' },
  'withdraw.error':           { fr: 'Erreur lors de la suppression.', en: 'Deletion failed.' },
  'withdraw.successTitle':    { fr: 'Candidature retirée',      en: 'Application Withdrawn' },
  'withdraw.successText':     { fr: 'Votre candidature et vos données ont été définitivement supprimées.', en: 'Your application and data have been permanently deleted.' },
  'withdraw.backToJobs':      { fr: 'Voir les offres d\'emploi', en: 'View Job Openings' },
  // ── Candidate ── 
  'candidate.title':          { fr: 'Candidats pour :',                en: 'Candidates for:' },
  'candidate.name':           { fr: 'Nom',                      en: 'Name' },
  'candidate.email':          { fr: 'Email',                    en: 'Email' },
  'candidate.createdAt':      { fr: 'Date d\'inscription',      en: 'Application Date' },
  'candidate.status':         { fr: 'Statut',                   en: 'Status' },
  'candidate.retour':         { fr: 'Retour à la page précédente',  en: 'Back' },
  'candidate.message':        { fr: 'Aucun candidat n\a postulé pour cette offre.', en: 'No candidates have applied for this position.' },
  'candidate.btnback':          { fr: 'Précédent',                 en: 'Previous' },
  'candidate.btnnext':          { fr: 'Suivant',                   en: 'Next' },


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
