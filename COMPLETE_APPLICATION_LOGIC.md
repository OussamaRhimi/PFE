# 📚 GUIDE COMPLET - LOGIQUE DE TOUTE L'APPLICATION

## 🎯 Table des Matières

1. [Architecture Globale](#-architecture-globale)
2. [Sprint 1 - Fondations RH](#sprint-1--fondations-rh--crud-de-base)
3. [Sprint 2 - Candidature Publique](#sprint-2--candidature-publique--gdpr)
4. [Sprint 3 - Pipeline IA](#sprint-3--pipeline-ia)
5. [Sprint 4 - Support Décisionnel](#sprint-4--support-décisionnel-et-analytics)
6. [Base de Données](#-base-de-données)
7. [Services Frontend](#-services-frontend)
8. [Flux Complets](#-flux-complets-d-exécution)

---

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION FULL-STACK                           │
├─────────────────────┬───────────────────────────────────────────────┤
│   PORTAIL PUBLIC    │         PORTAIL RH (Authentifié)             │
│   (Pas de login)    │         (JWT Protection)                      │
├─────────────────────┼───────────────────────────────────────────────┤
│                                                                     │
│  Frontend (Angular 17+)                                             │
│  ├─ /public-jobs (liste offres)           (pages RH)               │
│  ├─ /apply/{id} (formulaire candidature)  ├─ /dashboard           │
│  ├─ /track (suivi candidature)            ├─ /candidates          │
│  ├─ /chat (assistant)                     ├─ /job-postings        │
│  └─ /recommendations                      ├─ /skills              │
│                                           ├─ /departments         │
│                                           ├─ /cv-templates        │
│                                           ├─ /ai-evaluation       │
│                                           ├─ /analytics           │
│                                           └─ /login               │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Backend (Strapi REST API)                                          │
│  ├─ /api/candidates (CRUD + Pipeline IA)                          │
│  ├─ /api/job-postings (CRUD + filtrage)                           │
│  ├─ /api/skills (CRUD + Autocomplete)                             │
│  ├─ /api/departments (CRUD + Autocomplete)                        │
│  ├─ /api/meta (Templates CV config)                               │
│  ├─ /api/hr/analytics (Statistiques)                              │
│  ├─ /api/auth (Login RH)                                          │
│  └─ Webhook: Ollama Local (IA parsing)                            │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Données Persistantes:                                              │
│  ├─ PostgreSQL (Strapi CMS)                                        │
│  ├─ Ollama Local (Embedding & LLM)                                │
│  └─ File Storage (/public/uploads)                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Entités Principales et Leurs Relations

```
┌─────────────────────────┐
│      Skills             │
├─────────────────────────┤
│ id: int                 │
│ name: string (unique)   │
│ createdAt: date         │
└────────────┬────────────┘
             │
             │ referenced in
             ▼
┌─────────────────────────────────────────┐
│      Job Posting                        │
├─────────────────────────────────────────┤
│ id: int                                 │
│ title: string                           │
│ description: text                       │
│ status: enum (draft/open/closed)        │
│ requirements: JSON {                    │
│   skillsRequired: [string],             │
│   skillsNiceToHave: [string],           │
│   minYearsExperience: number,           │
│   evaluationConfig: {...}               │
│ }                                       │
│ department_id: FK                       │ ──────────┐
│ createdAt: date                         │           │
└──────────┬─────────────────────────────┘           │
           │                                         │
           │ parent                                  │
           ▼                                         │
┌──────────────────────────────┐      ┌─────────────┴──────────────┐
│      Candidate              │      │    Department              │
├──────────────────────────────┤      ├────────────────────────────┤
│ id: int                      │      │ id: int                    │
│ fullName: string             │      │ name: string (unique)      │
│ email: email                 │      │ createdAt: date            │
│ resume: media (URL)          │      └────────────────────────────┘
│ linkedin: URL                │
│ portfolio: URL               │
│ country, city: string        │
│ job_posting_id: FK ──────────┼────► Job Posting (relation)
│ status: enum                 │      
│   new                        │      Status Machine:
│   processing ◄──┐            │      new → processing → processed
│   processed  │  │            │           ↓             ↓
│   reviewing  │  │            │         error     reviewing
│   shortlisted│  │            │                        ↓
│   rejected ──┘  │            │                   shortlisted
│   hired      ◄──┘ retry      │                        ↓
│ score: decimal               │                      hired
│ extractedData: JSON {        │      Terminal states:
│   contact: {...},           │      - rejected ✗
│   skills: [...],            │      - hired ✓
│   experience: [...],        │
│   evaluation: {...}         │
│ }                           │
│ standardizedCvMarkdown: str │
│ consent: boolean (GDPR)     │
│ consentAt: date             │
│ retentionUntil: date        │
│ publicToken: string         │
│ trackingCodeHash: string    │
│ hrNotes: text               │
│ candidateNotes: text        │
│ createdAt: date             │
│ updatedAt: date             │
└──────────────────────────────┘
```

---

# 🚀 SPRINT 1 – FONDATIONS RH + CRUD DE BASE

**Durée:** 25 jours (75 heures) | **Objectif:** Établir les bases du système de gestion RH

## Sprint 1 : Overview

```
┌──────────────────────────────────────────────────────┐
│         SPRINT 1: Modèles & CRUD RH                 │
├──────────────────────────────────────────────────────┤
│                                                      │
│  S1-US1 │ Backend  │ Config Auth Strapi + JWT       │ 4j
│  S1-US1 │ Frontend │ Page login + Guard             │ 6j
│         │          │                                │
│  S1-US2 │ Backend  │ Contenu type: Compétence      │ 3j
│  S1-US2 │ Frontend │ Page CRUD compétences         │ 7j
│         │          │                                │
│  S1-US3 │ Backend  │ Recherche/Filtre compétences  │ 3j
│  S1-US3 │ Frontend │ Autocomplete compétences      │ 3j
│         │          │                                │
│  S1-US4 │ Backend  │ Contenu type: Département    │ 3j
│  S1-US4 │ Frontend │ CRUD Département             │ 5j
│         │          │                                │
│  S1-US5 │ Backend  │ Recherche/Filtre département │ 2j
│  S1-US5 │ Frontend │ Autocomplete département     │ 4j
│         │          │                                │
│  S1-US6 │ Backend  │ Offre d'emploi JSON          │ 5j
│  S1-US6 │ Frontend │ UI formulaire offre          │ 8j
│         │          │                                │
│  S1-US7 │ Backend  │ Logique transition offre      │ 4j
│  S1-US7 │ Frontend │ UI statut & dialogs           │ 3j
│         │          │                                │
│  S1-US8 │ Backend  │ Suppression en cascade        │ 3j
│  S1-US8 │ Frontend │ Dialog confirmation           │ 3j
│         │          │                                │
│  S1-US9 │ Frontend │ Shell admin & navigation      │ 9j
│         │          │                                │
└──────────────────────────────────────────────────────┘
```

### 🔐 S1-US1: Authentication RH

**Backend:**
- Fichier: [`backend/config/admin.ts`](backend/config/admin.ts)
- Strapi fournit JWT automatiquement
- Endpoint: `POST /api/auth/local`
  ```json
  Request: { email: "rh@company.com", password: "pass123" }
  Response: { 
    jwt: "eyJhbGc...",
    user: { id: 1, email: "rh@company.com" }
  }
  ```

**Frontend:**
- Service: [`frontend/src/app/services/auth.service.ts`](frontend/src/app/services/auth.service.ts)
- Guard: [`frontend/src/app/guards/auth.guard.ts`](frontend/src/app/guards/auth.guard.ts)
- Interceptor: [`frontend/src/app/interceptors/token.interceptor.ts`](frontend/src/app/interceptors/token.interceptor.ts)

**Logique:**
```typescript
// 1. Login
login(email, password) {
  POST /api/auth/local → JWT reçu
  localStorage.setItem('token', jwt)
}

// 2. Chaque requête
HttpClient intercept:
  header Authorization: "Bearer {jwt}"

// 3. Navigation protégée
canActivate() {
  if (!isLoggedIn()) → redirect /login
  else → allow access
}
```

---

### 🏷️ S1-US2 à S1-US5: CRUD Skills & Departments

**Modèles Strapi:**
- [`backend/src/api/skill/content-types/skill/schema.json`](backend/src/api/skill/content-types/skill/schema.json)
  ```json
  {
    "name": { "type": "string", "required": true, "unique": true }
  }
  ```

- [`backend/src/api/department/content-types/department/schema.json`](backend/src/api/department/content-types/department/schema.json)
  ```json
  {
    "name": { "type": "text", "required": true, "unique": true }
  }
  ```

**Endpoints CRUD (Strapi auto-generate):**
```
GET    /api/skills              → Lister tous
POST   /api/skills              → Créer
GET    /api/skills/:id          → Détail
PUT    /api/skills/:id          → Modifier
DELETE /api/skills/:id          → Supprimer
```

**Frontend Services:**
- [`frontend/src/app/services/skill.service.ts`](frontend/src/app/services/skill.service.ts)
- [`frontend/src/app/services/department.service.ts`](frontend/src/app/services/department.service.ts)

```typescript
// Exemple: Créer une compétence
create(name: string) {
  POST /api/skills { data: { name } }
}

// Recherche autocomplete
search(query: string) {
  GET /api/skills?filters[name][$containsi]={query}
  Retourne les résultats filtrés
}
```

**Pages Frontend:**
- [`frontend/src/app/pages/skills/skills.component.ts`](frontend/src/app/pages/skills/skills.component.ts)
- [`frontend/src/app/pages/departments/departments.component.ts`](frontend/src/app/pages/departments/departments.component.ts)

---

### 💼 S1-US6 à S1-US8: Job Postings CRUD

**Modèle Strapi:**
- [`backend/src/api/job-posting/content-types/job-posting/schema.json`](backend/src/api/job-posting/content-types/job-posting/schema.json)

```json
{
  "title": { "type": "string", "required": true },
  "description": { "type": "richtext" },
  "status": { 
    "type": "enumeration", 
    "enum": ["draft", "open", "closed"],
    "default": "draft"
  },
  "requirements": {
    "type": "json",
    "required": false
  },
  "department": {
    "type": "relation",
    "relation": "manyToOne",
    "target": "api::department.department"
  }
}
```

**Requirements JSON Schema:**
```typescript
{
  skillsRequired: ["React", "TypeScript"],
  skillsNiceToHave: ["Docker", "AWS"],
  departments: ["Engineering", "R&D"],
  minYearsExperience: 3,
  notes: "Remote friendly",
  evaluationConfig: {
    fitWeight: 75,
    completenessWeight: 25,
    // ... autres poids
  }
}
```

**Logique de transition (S1-US7):**
```
Backend: backend/src/api/job-posting/controllers/job-posting.ts

VALID_TRANSITIONS = {
  draft: ['open'],        // Publier l'offre
  open: ['closed'],       // Fermer les candidatures
  closed: ['open']        // Réouvrir
}

Validation: 
  currentStatus → newStatus 
  Si non valide → erreur 400
```

**Frontend Page:**
- [`frontend/src/app/pages/job-postings/job-postings.component.ts`](frontend/src/app/pages/job-postings/job-postings.component.ts)

---

### 🎨 S1-US9: Shell Admin & Navigation

**Routes RH (protégées par Auth Guard):**
- [`frontend/src/app/app.routes.ts`](frontend/src/app/app.routes.ts)

```typescript
const RH_ROUTES = [
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'skills', component: SkillsComponent, canActivate: [authGuard] },
  { path: 'departments', component: DepartmentsComponent, canActivate: [authGuard] },
  { path: 'job-postings', component: JobPostingsComponent, canActivate: [authGuard] },
  { path: 'candidates', component: CandidatesComponent, canActivate: [authGuard] },
  { path: 'analytics', component: AnalyticsComponent, canActivate: [authGuard] },
  { path: 'ai-evaluation', component: AiEvaluationComponent, canActivate: [authGuard] },
  { path: 'cv-templates', component: CvTemplatesComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
];
```

---

# 🎯 SPRINT 2 – CANDIDATURE PUBLIQUE + GDPR

**Durée:** 27 jours (81 heures) | **Objectif:** Portail candidat public + flux GDPR

## Sprint 2: Overview

```
┌────────────────────────────────────────────────────────┐
│    SPRINT 2: Candidatures Publiques + Suivi           │
├────────────────────────────────────────────────────────┤
│                                                        │
│  S2-US1 │ Backend  │ Route offres publiques          │ 3j
│  S2-US1 │ Frontend │ Page liste offres (public)      │ 6j
│         │          │                                 │
│  S2-US2 │ Backend  │ Endpoint création candidat      │ 5j
│  S2-US2 │ Frontend │ Form candidature + file upload  │ 7j
│         │          │                                 │
│  S2-US3 │ Backend  │ Champs consentement GDPR        │ 4j
│  S2-US3 │ Frontend │ Checkbox consentement RGPD      │ 4j
│         │          │                                 │
│  S2-US4 │ Backend  │ Génération code verification    │ 5j
│  S2-US4 │ Frontend │ Page suivi par email code       │ 4j
│         │          │                                 │
│  S2-US5 │ Backend  │ Endpoint suppression GDPR       │ 3j
│  S2-US5 │ Frontend │ Dialog confirmation suppression │ 3j
│         │          │                                 │
│  S2-US6 │ Backend  │ Route HR liste candidats        │ 3j
│  S2-US6 │ Frontend │ UI révision candidats (tableau) │ 8j
│         │          │                                 │
│  S2-US7 │ Backend  │ Endpoint détail candidat        │ 3j
│  S2-US7 │ Frontend │ Vue détail + téléchargement CV  │ 6j
│         │          │                                 │
│  S2-US8 │ Backend  │ Update statut avec validation   │ 3j
│  S2-US8 │ Frontend │ Menu déroulant changement stat  │ 6j
│         │          │                                 │
│  S2-US9 │ Backend  │ Update notes HR                 │ 4j
│  S2-US9 │ Frontend │ Éditeur notes                   │ 5j
│         │          │                                 │
└────────────────────────────────────────────────────────┘
```

### 🌍 S2-US1: Route Publique des Offres Ouvertes

**Backend:**
- Fichier: [`backend/src/api/job-posting/controllers/job-posting.ts#L51`](backend/src/api/job-posting/controllers/job-posting.ts#L51)

```typescript
async findOpen(ctx) {
  // Force le filtre status = "open"
  ctx.query.filters = { status: { $eq: 'open' } };
  return super.find(ctx); // Utilise pagination
}
```

**Endpoint:**
```
GET /api/job-postings/public
Auth: false (public)
Retourne: [{ id, title, description, requirements, status }]
```

**Frontend:**
- Service: [`frontend/src/app/services/job-posting.service.ts`](frontend/src/app/services/job-posting.service.ts)
- Page: [`frontend/src/app/pages/public-jobs/public-job-list.component.ts`](frontend/src/app/pages/public-jobs/public-job-list.component.ts)

---

### 📝 S2-US2: Formulaire Candidature + Upload

**Validation côté Client:**
```typescript
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];
const MAX_SIZE_MB = 5;

if (!ALLOWED_TYPES.includes(file.type)) {
  error: "Type de fichier non autorisé"
}
if (file.size / (1024 * 1024) > MAX_SIZE_MB) {
  error: "Fichier trop volumineux"
}
```

**Validation côté Serveur:**
```typescript
// backend/src/api/candidate/controllers/candidate.ts
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const MAX_FILE_SIZE_MB = 5;

if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
  ctx.badRequest(`Invalid file type`)
}
if (fileSizeMB > MAX_FILE_SIZE_MB) {
  ctx.badRequest(`File too large`)
}
```

**Création candidat:**
```
POST /api/candidates
FormData: {
  fullName: "Jean Dupont",
  email: "jean@example.com",
  resume: <File>,
  job_posting: 1,
  consent: true,
  consentAt: "2024-04-25T10:00:00Z"
}
```

---

### 🔒 S2-US3 à S2-US5: GDPR Consentement + Suppression

**Flux GDPR:**

```
┌─────────────────────────────────────────────┐
│    CANDIDATURE AVEC CONSENTEMENT            │
├─────────────────────────────────────────────┤
│                                             │
│ 1. User remplit form                       │
│    • Accepte consentement ✓                │
│    • consentAt = NOW                       │
│    • retentionUntil = NOW + 24 mois        │
│                                             │
│ 2. Backend valide                          │
│    if (!consent) {                         │
│      error: "Consentement requis"          │
│    }                                        │
│                                             │
│ 3. Données stockées                        │
│    {                                       │
│      consent: true,                        │
│      consentAt: "2024-04-25",              │
│      retentionUntil: "2026-04-25"          │
│    }                                        │
│                                             │
│ 4. Suppression automatique                 │
│    Cron job: Vérifie retentionUntil       │
│    À expiration → DELETE candidat + CV   │
│                                             │
│ 5. Suppression manuelle (avant expiration) │
│    DELETE /api/candidates/{id}             │
│    User reçoit: "Candidature supprimée"   │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 📧 S2-US4: Suivi par Email

**Génération code de vérification:**
```typescript
const code = Math.floor(100000 + Math.random() * 900000); // 6 chiffres
const codeHash = sha256(`${email}:${code}:${secret}`);
const expiresAt = NOW + 15 minutes;

// Stocké en base
candidate.trackingCodeHash = codeHash;
candidate.trackingCodeExpiresAt = expiresAt;

// Email envoyé
send_email(email, `Code: ${code}`)
```

**Vérification:**
```
POST /api/candidates/verify-tracking-code
Body: { email, code }

Validation:
  • hash(code) == trackingCodeHash
  • NOW < trackingCodeExpiresAt
  
Réponse:
  { publicToken, status, score, createdAt, updatedAt }
```

---

### 👥 S2-US6 à S2-US9: Révision RH des Candidats

**Page des candidats (RH):**
- [`frontend/src/app/pages/candidates/candidates-list.component.ts`](frontend/src/app/pages/candidates/candidates-list.component.ts)

```
┌──────────────────────────────────────────────────────────┐
│           TABLEAU RÉVISION CANDIDATS                     │
├──────────────────────────────────────────────────────────┤
│ Nom        │ Email        │ Status      │ Score │ Actions│
├──────────────────────────────────────────────────────────┤
│ Jean D.    │ jean@...     │ ✓ Processed │ 85.5  │ ...    │
│ Marie L.   │ marie@...    │ ⏳ Processing│ -    │ ...    │
│ Tom W.     │ tom@...      │ ✗ Rejected  │ 32   │ ...    │
└──────────────────────────────────────────────────────────┘
```

**Détail candidat:**
- [`frontend/src/app/pages/candidates/candidate-detail.component.ts`](frontend/src/app/pages/candidates/candidate-detail.component.ts)

```
Affiche:
• Infos candidat (nom, email, téléphone, localisation)
• CV prévisualisé
• Score IA + breakdown évaluation
• Historique statuts
• Notes HR (éditables)
• Actions: Changer statut, Ajouter notes, Télécharger CV
```

---

# 🤖 SPRINT 3 – PIPELINE IA

**Durée:** 26 jours (78 heures) | **Objectif:** Traitement IA complet des CVs

*[Voir le document SPRINT3_COMPLETE_LOGIC.md pour les détails complets]*

## Sprint 3: Pipeline Principal

```
UPLOAD CV
    │
    ▼
┌─ EXTRACT TEXT ─┐ (PDF/DOCX/TXT → texte brut)
│                │
└─ PARSE IA ─────┘ (Ollama structurise JSON)
                      ↓ contact, skills, experience
                      
┌─ EVALUATE ──────┐ (Scoring déterministe)
│                 │
└─ GENERATE CV ───┘ (Markdown via template)
                      ↓
             UPDATE DATABASE
                      ↓
            DISPLAY FRONTEND
```

### 🔄 S3-US1: Orchestration Pipeline

**Backend:**
- Fichier: [`backend/src/api/candidate/controllers/candidate.ts`](backend/src/api/candidate/controllers/candidate.ts)

```typescript
// Après création candidat, déclenche automatiquement
status: "new" → "processing" → "processed" ou "error"

// Le pipeline complet:
processCandidate(candidateId) {
  1. Charger candidat + CV
  2. Extraire texte
  3. Parser avec Ollama
  4. Évaluer fit
  5. Générer CV markdown
  6. Mettre à jour DB
}
```

### 📄 S3-US2: Extraction Texte CV

**Backend:**
- Fichier: [`backend/src/utils/resume-text.ts`](backend/src/utils/resume-text.ts)

```
PDF        → pdf-parse (ou pdfjs-dist fallback)
DOCX       → mammoth
TXT        → lecture directe

↓
Normalisation:
• \r\n → \n
• – — → -
• Fusionne lignes hyphenées
• Standardise labels (Email:, Phone:)

↓
Texte propre & prêt pour Ollama
```

### 🧠 S3-US3: Analyse Ollama

**Backend:**
- Fichier: [`backend/src/utils/candidate-ai.ts#L2950`](backend/src/utils/candidate-ai.ts#L2950)

```
Input: Texte brut du CV
        ↓
     Ollama API
        ↓ Prompt: "Structurez ce CV en JSON"
        ↓
Output: {
  contact: { fullName, email, phone, location, linkedin, portfolio },
  skills: ["React", "TypeScript", ...],
  summary: "...",
  experience: [{ company, title, startDate, endDate, highlights }],
  education: [{ school, degree, startDate, endDate }],
  certifications: [...],
  projects: [{ name, description, links }],
  languages: [...]
}

Si JSON invalide → Tentative réparation → Fallback heuristique
```

### ⭐ S3-US4: Évaluation Déterministe

**Backend:**
- Fichier: [`backend/src/utils/candidate-ai.ts#L2606`](backend/src/utils/candidate-ai.ts#L2606)

```
SCORE FINAL = (Fit Score × 75%) + (Complétude × 25%)

Fit Score = 
  (Skills Requis × 75%) +
  (Skills Bonus × 15%) +
  (Expérience × 10%)

Complétude = Points pour champs remplis / Points max

Résultat:
{
  score: 85.5,
  qualityLabel: "excellent" | "good" | "fair" | "poor",
  breakdown: {
    fitScore: 87,
    completenessScore: 82,
    skillsMatched: ["React", "TypeScript"],
    skillsMissing: ["Kubernetes"],
    experienceYears: 4
  }
}
```

### 📑 S3-US5: Génération CV Standardisé

**Backend:**
- Fichier: [`backend/src/utils/cv-templates.ts`](backend/src/utils/cv-templates.ts)

```
Templates disponibles:
• standard  - Format classique
• compact   - Version condensée
• modern    - Design moderne
• ats       - Optimisé parseurs ATS

Processus:
1. Charger template
2. Remplir données: contact + skills + experience
3. Générer Markdown
4. Stocker en standardizedCvMarkdown
```

**Frontend:**
- [`frontend/src/app/pages/candidates/candidate-detail.component.ts`](frontend/src/app/pages/candidates/candidate-detail.component.ts)

Affiche le CV en preview (Markdown rendu HTML)

### 🎨 S3-US6: Catalogue Templates

**Backend:**
- Fichier: [`backend/src/api/meta/controllers/meta.ts`](backend/src/api/meta/controllers/meta.ts)

```
GET /api/meta/default-template
  → Retourne: { templateKey: "standard" }

PUT /api/meta/default-template
  Body: { templateKey: "compact" }
  → Sauvegarde le template par défaut
```

**Frontend:**
- [`frontend/src/app/pages/cv-templates/cv-templates.component.ts`](frontend/src/app/pages/cv-templates/cv-templates.component.ts)

Sélecteur de template avec preview

### 📥 S3-US7: Conversion PDF

**Backend:**
- Fichier: [`backend/src/utils/html-pdf.ts`](backend/src/utils/html-pdf.ts)

```
Markdown → HTML → PDF (Playwright)

GET /api/candidates/{id}/download-cv
  → Récupère standardizedCvMarkdown
  → Convertit HTML
  → Playwright génère PDF
  → Retourne PDF Buffer
```

**Frontend:**
```typescript
// Click button
downloadCvPdf() {
  GET /api/candidates/{id}/download-cv
  → Reçoit Blob PDF
  → Crée lien de téléchargement
  → Simule click
  → File "Nom_CV.pdf" téléchargée
}
```

### ↩️ S3-US8: Logique de Retrait

**Backend:**
```typescript
VALID_STATUS_TRANSITIONS = {
  new:        ['processing', 'rejected'],
  processing: ['processed', 'error'],
  processed:  ['reviewing', 'rejected'],
  reviewing:  ['shortlisted', 'rejected'],
  shortlisted:['hired', 'rejected'],
  rejected:   [],     // Terminal
  hired:      [],     // Terminal
  error:      ['processing']
}

PUT /api/candidates/{id}
Body: { status: "rejected" }
→ Valide transition
→ Met à jour
```

**Frontend:**
```typescript
rejectCandidate() {
  Modal: "Êtes-vous sûr?"
  PUT /api/candidates/{id}
  → Status: "rejected" (rouge badge)
}
```

---

# 📊 SPRINT 4 – SUPPORT DÉCISIONNEL ET ANALYTICS

**Durée:** 24 jours (72 heures) | **Objectif:** Tableau de bord, analytics et filtrage avancé

## Sprint 4: Overview

```
┌──────────────────────────────────────────────────────┐
│   SPRINT 4: Analytics, Filtrage, Recommandations   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  S4-US1 │ Backend  │ Paramètres filtrage multi      │ 3j
│  S4-US1 │ Frontend │ UI barre filtres               │ 5j
│         │          │                                │
│  S4-US2 │ Backend  │ Filtre par score               │ 3j
│  S4-US2 │ Frontend │ Sélecteur seuil score          │ 3j
│         │          │                                │
│  S4-US3 │ Backend  │ Support par offre              │ 3j
│  S4-US3 │ Frontend │ Dropdown offre dans filtres    │ 3j
│         │          │                                │
│  S4-US4 │ Backend  │ Mise à jour status en masse    │ 3j
│  S4-US4 │ Frontend │ Cases multi-select et actions  │ 5j
│         │          │                                │
│  S4-US5 │ Backend  │ Endpoint analytics KPI         │ 6j
│  S4-US5 │ Frontend │ Dashboard avec graphiques      │ 5j
│         │          │                                │
│  S4-US6 │ Backend  │ Meta API template par défaut   │ 3j
│  S4-US6 │ Frontend │ UI param template              │ 4j
│         │          │                                │
│  S4-US7 │ Backend  │ Config évaluation IA           │ 5j
│  S4-US7 │ Frontend │ Form config poids scores       │ 4j
│         │          │                                │
│  S4-US8 │ Backend  │ Moteur recommandations         │ 8j
│  S4-US8 │ Frontend │ Widget scores compatibilité    │ 3j
│         │          │                                │
│  S4-US9 │ Backend  │ Chat Ollama intégré            │ 4j
│  S4-US9 │ Frontend │ Widget chat flottant            │ 2j
│         │          │                                │
└──────────────────────────────────────────────────────┘
```

### 🔍 S4-US1 à S4-US4: Filtrage Avancé

**Backend:**
```
GET /api/candidates
  ?filters[status]=$eq=processed
  &filters[score][$gte]=70
  &filters[job_posting][id]=$eq=5
  &sort=-score

Retourne candidats filtrés et paginés
```

**Frontend:**
- [`frontend/src/app/pages/candidates/candidates-list.component.ts`](frontend/src/app/pages/candidates/candidates-list.component.ts)

```
Filtres disponibles:
□ Statut (dropdown)
□ Score min-max (range slider)
□ Offre d'emploi (autocomplete)

Actions groupées:
□ Sélectionner tous
  ☑ Candidat 1
  ☑ Candidat 2
[Changer statut] [Ajouter tags]
```

### 📈 S4-US5: Analytics Dashboard

**Backend:**
- Fichier: [`backend/src/api/analytics/controllers/analytics.ts`](backend/src/api/analytics/controllers/analytics.ts)

```typescript
GET /api/hr/analytics

Retourne: {
  totals: {
    candidates: 145,
    jobs: 12,
    openJobs: 5
  },
  statusCounts: {
    new: 15,
    processing: 8,
    processed: 95,
    reviewing: 20,
    shortlisted: 5,
    hired: 2
  },
  scoreBuckets: [
    { label: "0-49", count: 25 },
    { label: "50-69", count: 45 },
    { label: "70-84", count: 55 },
    { label: "85-100", count: 20 }
  ],
  monthlyApplications: [
    { month: "2024-01", count: 32 },
    { month: "2024-02", count: 48 },
    ...
  ]
}
```

**Frontend:**
- [`frontend/src/app/pages/analytics/analytics.component.ts`](frontend/src/app/pages/analytics/analytics.component.ts)

```
Graphiques Chart.js:
• Pie: Distribution par statut
• Bar: Distribution des scores
• Line: Candidatures par mois
• Cards: KPIs clés

Refresh: bouton pour actualiser
```

### ⚙️ S4-US6 à S4-US7: Configuration IA

**Configuration templates:**
- [`frontend/src/app/pages/cv-templates/cv-templates.component.ts`](frontend/src/app/pages/cv-templates/cv-templates.component.ts)

Sélectionner template par défaut pour tous les nouveaux candidats

**Configuration évaluation:**
- [`frontend/src/app/pages/ai-evaluation/ai-evaluation.component.ts`](frontend/src/app/pages/ai-evaluation/ai-evaluation.component.ts)

```
Par offre d'emploi:
├─ Poids scores:
│  └ Fit: 75%, Complétude: 25%
├─ Poids compétences:
│  └ Requis: 75%, Bonus: 15%, Expérience: 10%
├─ Points complétude
│  └ Champs (fullName: 10pts, email: 15pts, ...)
└─ Seuils qualité
   └ Excellent: 80, Good: 60, Fair: 40
```

### 💡 S4-US8: Moteur de Recommandations

```
Pour chaque candidat:
  candidates = GET /api/candidates (processed)
  
  Pour chaque offre ouverte:
    score = evaluateFit(candidate.data, job.requirements)
    
    if score >= 70:
      recommendations.push({
        jobId: job.id,
        jobTitle: job.title,
        score: score,
        match: "excellent|good|fair|poor"
      })
      
Affichage: Card "Vous pourriez être intéressé par X offre(s)"
          Scores de compatibilité
```

### 💬 S4-US9: Chatbot IA

```
Frontend:
• Widget flottant en bas à droite
• Message: "Besoin d'aide?"
• Historique messages

Backend:
POST /api/chat
Body: { message: "..." }
→ Ollama répond
→ Contexte: offres, candidat, général

Cas d'usage:
• "Quels jobs me correspondent?"
• "Comment améliorer mon score?"
• "Explique les compétences requises"
```

---

# 🗄️ BASE DE DONNÉES

## Schéma Complet

```sql
-- SKILLS
CREATE TABLE skills (
  id INT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- DEPARTMENTS
CREATE TABLE departments (
  id INT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- JOB_POSTINGS
CREATE TABLE job_postings (
  id INT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  requirements JSONB DEFAULT NULL,  -- skillsRequired, minYearsExp, etc.
  status ENUM('draft', 'open', 'closed') DEFAULT 'draft',
  department_id INT REFERENCES departments(id),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- CANDIDATES
CREATE TABLE candidates (
  id INT PRIMARY KEY,
  fullName VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  linkedin VARCHAR(300),
  portfolio VARCHAR(300),
  country VARCHAR(120),
  city VARCHAR(120),
  resume_url VARCHAR(500),  -- URL vers le fichier PDF/DOCX/TXT
  
  job_posting_id INT REFERENCES job_postings(id),
  status ENUM('new', 'processing', 'processed', 'reviewing', 
              'shortlisted', 'rejected', 'hired', 'error') DEFAULT 'new',
  score DECIMAL(5,2) DEFAULT 0,
  
  extractedData JSONB DEFAULT NULL,  -- { contact, skills, experience, education, evaluation }
  standardizedCvMarkdown TEXT,
  
  publicToken VARCHAR(255) UNIQUE,
  trackingCodeHash VARCHAR(255),
  trackingCodeExpiresAt TIMESTAMP,
  
  -- GDPR
  consent BOOLEAN DEFAULT FALSE,
  consentAt TIMESTAMP,
  retentionUntil TIMESTAMP,
  
  hrNotes TEXT,
  candidateNotes TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## Flux des Données

```
┌───────────────────────────────────────┐
│     User uploads application           │
│     (fullName, email, resume)          │
└──────────────┬────────────────────────┘
               │
               ▼
        ┌─────────────┐
        │  PostgreSQL │
        │  Candidate  │
        │ status=new  │
        └──────┬──────┘
               │
               ├─→ [TRIGGER] processCandidate()
               │
               ▼
        ┌─────────────┐
        │   Ollama    │
        │  Parsing    │
        └──────┬──────┘
               │
               ├─→ extractedData: {
               │    contact, skills,
               │    experience, education,
               │    evaluation score
               │   }
               │
               ├─→ standardizedCvMarkdown
               │
               ▼
        ┌─────────────┐
        │  PostgreSQL │
        │  Candidate  │
        │ status=     │
        │ processed   │
        │ score=X.XX  │
        └─────────────┘
               │
               ▼
        ┌─────────────┐
        │  Frontend   │
        │  Display    │
        │  Candidate  │
        │  + Score    │
        └─────────────┘
```

---

# 🔧 SERVICES FRONTEND

## Architecture Services

```
frontend/src/app/services/
├── auth.service.ts              → Login, logout, JWT management
├── candidate.service.ts         → CRUD candidats, tracking
├── job-posting.service.ts       → CRUD offres emploi
├── skill.service.ts             → CRUD compétences
├── department.service.ts        → CRUD départements
├── analytics.service.ts         → Statistiques KPI
└── i18n.service.ts              → Internationalisation
```

### auth.service.ts

```typescript
Methods:
• login(email, password)
  → POST /api/auth/local
  → Stocke JWT + user en localStorage
  
• logout()
  → Supprime localStorage
  → Redirect /login
  
• isLoggedIn()
  → Vérifie token en localStorage
  
• getCurrentUser()
  → Observable du user courant
```

### candidate.service.ts

```typescript
Methods:
• getAll(filters?, page?)
  → GET /api/candidates?filters=...&pagination[page]=...
  
• getOne(id)
  → GET /api/candidates/{id}
  
• create(payload)
  → POST /api/candidates {fullName, email, resume, job_posting}
  
• update(id, payload)
  → PUT /api/candidates/{id}
  
• delete(id)
  → DELETE /api/candidates/{id}
  
• updateStatus(id, newStatus)
  → PUT /api/candidates/{id} {status}
  
• downloadCvPdf(id)
  → GET /api/candidates/{id}/download-cv (returns Blob)
  
• verifyTrackingCode(email, code)
  → POST /api/candidates/verify-tracking {email, code}
  
• getCvPreview(id, templateKey)
  → GET /api/candidates/{id}/cv-preview?template={templateKey}
```

### job-posting.service.ts

```typescript
Methods:
• getAll(filters?)
  → GET /api/job-postings
  
• getPublicJobs()
  → GET /api/job-postings/public (auth: false)
  
• getOne(id)
  → GET /api/job-postings/{id}
  
• create(payload)
  → POST /api/job-postings {title, description, requirements}
  
• update(id, payload)
  → PUT /api/job-postings/{id}
  
• delete(id)
  → DELETE /api/job-postings/{id}
  
• changeStatus(id, newStatus)
  → PUT /api/job-postings/{id}/status {status}
```

---

# ⚙️ FLUX COMPLETS D'EXÉCUTION

## Flux 1: Candidature d'un utilisateur (Sprint 2 + 3)

```
┌─ USER: Browse offres
   GET /api/job-postings/public
   Affiche liste des offres ouvertes
   │
   ├─ USER: Click "Apply"
   │  Formulaire de candidature
   │  Remplit: nom, email, upload CV
   │  Accepte consentement GDPR
   │  │
   │  ├─ CLIENT: Validation fichier
   │  │  • Type MIME: PDF/DOCX/TXT
   │  │  • Taille max: 5MB
   │  │
   │  └─ POST /api/candidates
   │     {
   │       fullName: "Jean",
   │       email: "jean@example.com",
   │       resume: <FormData File>,
   │       job_posting: 1,
   │       consent: true,
   │       consentAt: "2024-04-25T10:00Z"
   │     }
   │
   │  ├─ BACKEND: Validation fichier
   │  │  • Type MIME check
   │  │  • Taille check
   │  │  • Si erreur → 400 Bad Request
   │  │
   │  ├─ BACKEND: Créer candidat
   │  │  candidate.status = "new"
   │  │  candidate.retentionUntil = NOW + 24 mois
   │  │
   │  └─ BACKEND: [TRIGGER] processCandidate(candidateId)
   │
   └─ PIPELINE IA (voir Sprint 3)
      1. Extract text from CV
      2. Parse with Ollama
      3. Evaluate fit score
      4. Generate standardized markdown
      5. Update candidate status → "processed"
      6. Update score, extractedData, markdown
      │
      └─ USER: Reçoit "Candidature reçue"
         • PublicToken pour suivi
         • Email avec code de vérification
         │
         ├─ USER: Click lien email
         │  Saisit code de vérification
         │  │
         │  └─ POST /api/candidates/verify-tracking
         │     { email, code }
         │     ↓
         │     Retourne: {
         │       status: "processed",
         │       score: 85.5,
         │       qualityLabel: "excellent"
         │     }
         │
         └─ PAGE SUIVI: Affiche score et statut
            • "Votre candidature a été traitée"
            • Score: 85.5/100
            • Status: Processing → Processed
```

## Flux 2: Révision RH (Sprint 2 + 3)

```
┌─ RH: Navigate to /candidates
   (auth guard → verify JWT)
   │
   ├─ GET /api/candidates?filters[status]=processed
   │  Affiche tableau candidats processés
   │
   ├─ RH: Click sur un candidat
   │  GET /api/candidates/{id}
   │  │
   │  └─ Affiche détail:
   │     • Score: 85.5
   │     • CV Preview (markdown)
   │     • Breakdown évaluation:
   │       - Skills matched: React, TypeScript
   │       - Skills missing: Kubernetes
   │       - Experience: 4 years (3 required) ✓
   │       - Completeness: 90%
   │
   ├─ RH: [Option 1] Change status
   │  Dropdown: processed → reviewing
   │  PUT /api/candidates/{id}
   │  { status: "reviewing" }
   │  ✓ Status updated
   │
   ├─ RH: [Option 2] Add HR notes
   │  Textarea: "Excellent technical skills, ..."
   │  PUT /api/candidates/{id}
   │  { hrNotes: "..." }
   │  ✓ Notes saved
   │
   └─ RH: [Option 3] Download PDF
      GET /api/candidates/{id}/download-cv
      ↓
      Backend:
        • Récupère standardizedCvMarkdown
        • convertHtmlToPdf()
        • Retourne PDF Blob
      ↓
      Frontend:
        • Crée lien de téléchargement
        • File: "Jean_CV.pdf" téléchargée
```

## Flux 3: Configuration Offre (Sprint 1 + 4)

```
┌─ RH: Navigate to /job-postings
   │
   ├─ RH: Click "Créer offre"
   │  Form: title, description
   │  │
   │  ├─ Skills requis (autocomplete)
   │  │  GET /api/skills?q=react
   │  │  ← ["React", "React Native", "React Router"]
   │  │  Select: React, TypeScript
   │  │
   │  ├─ Skills bonus
   │  │  Select: Docker, AWS
   │  │
   │  ├─ Années expérience: 3
   │  │
   │  ├─ [S4] Config évaluation
   │  │  Fit Weight: 75%
   │  │  Completeness Weight: 25%
   │  │  Seuils: Excellent 80, Good 60, Fair 40
   │  │
   │  └─ POST /api/job-postings
   │     {
   │       title: "Senior React Developer",
   │       description: "...",
   │       requirements: {
   │         skillsRequired: ["React", "TypeScript"],
   │         skillsNiceToHave: ["Docker", "AWS"],
   │         minYearsExperience: 3,
   │         evaluationConfig: {...}
   │       }
   │     }
   │
   ├─ RH: Change status
   │  draft → open
   │  PUT /api/job-postings/{id}/status
   │  { status: "open" }
   │  ✓ Offre maintenant visible publiquement
   │
   └─ RH: View analytics for this job
      GET /api/hr/analytics?job={jobId}
      Retourne: candidatures, distribution scores
      Affiche: Dashboard avec graphiques
```

## Flux 4: Filtrage et Actions Groupées (Sprint 4)

```
┌─ RH: Navigate to /candidates
   │
   ├─ Filtres appliqués:
   │  Status: processed
   │  Score min-max: 70-100
   │  Job: "Senior React Developer"
   │  │
   │  └─ GET /api/candidates?filters[status]=processed&filters[score][$gte]=70&filters[score][$lte]=100&filters[job_posting][id]=1
   │     ↓ Retourne candidats filtrés
   │
   ├─ RH: Sélectionne plusieurs candidats
   │  ☑ Candidat 1
   │  ☑ Candidat 3
   │  ☑ Candidat 5
   │  │
   │  └─ [Changer statut en masse]
   │     processed → reviewing
   │     │
   │     └─ PATCH /api/candidates/bulk
   │        { ids: [1, 3, 5], status: "reviewing" }
   │        ✓ 3 candidats mis à jour
   │
   └─ RH: View dashboard
      GET /api/hr/analytics
      Affiche:
      • 145 candidats total
      • 95 processed, 20 reviewing, 5 shortlisted
      • Distribution scores: 25 (0-49), 45 (50-69), 55 (70-84), 20 (85-100)
      • Graphique candidatures par mois
```

---

# 🎯 RÉSUMÉ GLOBAL

## 4 Sprints, 4 Phases Principales

| Sprint | Phase | Objectif | Durée |
|--------|-------|----------|-------|
| **S1** | 🏛️ **Fondations** | Modèles, CRUD, Auth | 25j |
| **S2** | 🌍 **Public** | Candidatures, GDPR, Suivi | 27j |
| **S3** | 🤖 **Intelligence** | Pipeline IA, Scoring, CV | 26j |
| **S4** | 📊 **Décisionnel** | Analytics, Filtrage, Reco | 24j |

## Technologies

```
Frontend:     Angular 17+, TypeScript, RxJS, Chart.js
Backend:      Strapi (Node.js), TypeScript
Database:     PostgreSQL
AI:           Ollama (LLM local)
Export:       Playwright (HTML → PDF)
File Storage: AWS S3 ou local /public/uploads
```

## Points Clés

✅ **Full-Stack:** Frontend Angular + Backend Strapi
✅ **IA Intégrée:** Ollama pour parsing/génération CV
✅ **GDPR Compliant:** Consentement, rétention, suppression
✅ **Analytics:** KPI, distributions, tendances
✅ **Modular:** 4 sprints, chacun autonome mais interconnectés
✅ **Dual Portal:** Public (candidats) + RH (gestion)
✅ **Real-time:** Mise à jour status, scores visibles immédiatement

---

Bon courage dans votre exploration! 🚀
