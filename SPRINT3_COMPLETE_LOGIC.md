# Sprint 3 - Analyse Complète et Logique de l'Application

## 📋 Vue d'ensemble du Sprint 3

Le Sprint 3 implémente le **pipeline IA complet** pour traiter les candidatures :
- Extraction du texte du CV (PDF, DOCX, TXT)
- Analyse structurée via Ollama
- Évaluation fit déterministe
- Génération d'un CV standardisé
- Conversion en PDF et téléchargement
- Interface de gestion des candidats avec statuts

---

## 🏗️ Architecture générale

```
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION FULL-STACK                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐              ┌──────────────┐                 │
│  │   FRONTEND   │              │   BACKEND    │                 │
│  │  (Angular)   │◄────REST────►│  (Strapi)    │                 │
│  └──────────────┘              └──────────────┘                 │
│       │                              │                           │
│       │ Affiche les candidats        │ Valide, traite,           │
│       │ et gérer les états           │ stocke les données        │
│       │                              │                           │
│       └──────────────┬───────────────┘                           │
│                      │                                           │
│                  ┌───┴────┐                                      │
│                  │         │                                     │
│              ┌───▼──┐   ┌──▼────┐                               │
│              │ BASE │   │OLLAMA  │  (IA Local)                  │
│              │  DE  │   │ Model  │                              │
│              │DONNEES   │        │                              │
│              └────────┘ └────────┘                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Structure de la Base de Données (Candidate)

```json
{
  "id": 1,
  "fullName": "String",
  "email": "String",
  "resume": {
    "url": "/uploads/cv.pdf",
    "name": "cv.pdf"
  },
  "job_posting": { "id": 1 },
  
  // US1 - Statut du traitement
  "status": "new|processing|processed|reviewing|shortlisted|rejected|hired|error",
  
  // US3, US4 - Données d'évaluation
  "extractedData": {
    "contact": { "fullName", "email", "phone", "location", "linkedin", "portfolio" },
    "skills": ["React", "Node.js", ...],
    "experience": [
      { "company", "title", "startDate", "endDate", "highlights" }
    ],
    "education": [
      { "school", "degree", "startDate", "endDate" }
    ],
    "evaluation": {
      "score": 85.5,
      "breakdown": {
        "fitScore": 87,
        "completenessScore": 82,
        "skillsMatched": ["React", "TypeScript"],
        "skillsMissing": ["Kubernetes"]
      },
      "qualityLabel": "excellent"
    }
  },
  
  // US5 - CV standardisé
  "standardizedCvMarkdown": "# Jean Dupont\n## Contact\n...",
  
  // Erreurs et notes
  "hrNotes": "AI processing failed at extract-text"
}
```

---

## 🔄 Pipeline Principal : `processCandidate()`

Fichier: [`backend/src/utils/candidate-ai.ts`](backend/src/utils/candidate-ai.ts#L2875)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PIPELINE D'IA COMPLET                         │
└─────────────────────────────────────────────────────────────────┘
        │
        ├─► 1️⃣ LOAD-CANDIDATE
        │   Récupère le candidat avec son CV et l'offre d'emploi
        │
        ├─► 2️⃣ LOAD-TEMPLATE
        │   Charge le template de CV sélectionné (standard, compact, etc.)
        │
        ├─► 3️⃣ EXTRACT-TEXT [US2]
        │   └─► Extraction du texte du CV selon son format :
        │       ├── PDF → pdf-parse (ou pdfjs-dist si malformé)
        │       ├── DOCX → mammoth
        │       └── TXT → lecture directe
        │       Normalise et nettoie le texte
        │
        ├─► 4️⃣ PARSE-RESUME (Ollama) [US3]
        │   └─► Analyse avec un prompt système :
        │       • Extrait : contact, skills, expérience, éducation, projets
        │       • Format: JSON structuré
        │       • En cas d'erreur JSON → tentative de réparation
        │
        ├─► 5️⃣ EVALUATE (Déterministe) [US4]
        │   └─► Calcule le score en analysant :
        │       • Skills requis vs présents (75% du poids)
        │       • Skills bonus (15% du poids)
        │       • Années d'expérience (10% du poids)
        │       • Complétude du CV (25% du poids)
        │       → Score final = 0-100
        │
        ├─► 6️⃣ GENERATE-CV (Ollama) [US5]
        │   └─► Génère un CV standardisé en Markdown :
        │       • Utilise le template sélectionné
        │       • Structure : contact + skills + expérience + éducation
        │       • Format propre et professionnel
        │
        └─► 7️⃣ UPDATE-CANDIDATE
            Met à jour la base de données :
            • status = "processed"
            • standardizedCvMarkdown = "# Nom\n..."
            • extractedData = {...}
            • score = 85.5
```

---

## 📌 Les 8 User Stories du Sprint 3

### **US1 - Orchestration du Pipeline (BE)**

**Fichier:** [`backend/src/api/candidate/controllers/candidate.ts`](backend/src/api/candidate/controllers/candidate.ts)

**Logique:**
- Déclenche la fonction `processCandidate()` automatiquement
- Gère les transitions d'état : `new` → `processing` → `processed` ou `error`
- Capture les erreurs à chaque étape et note la phase où ça s'est cassé

**Statuts valides (définis dans schema.json):**
```
new → processing → processed → reviewing → shortlisted → hired
              ↓
            error (terminal)
```

**Frontend:** Affiche l'indicateur de statut dans la liste des candidats

---

### **US1 (FE) - Indicateur de Statut et Erreurs**

**Fichier:** [`frontend/src/app/pages/candidates/candidates-list.component.ts`](frontend/src/app/pages/candidates/candidates-list.component.ts)

**Vue:**
```html
<span class="status-badge" [ngClass]="'badge-' + candidate.status">
  {{ candidate.status }}
</span>
```

**Couleurs et messages:**
- `new` → Gris (Non traité)
- `processing` → Orange (Traitement en cours - spinner)
- `processed` → Vert (Succès)
- `error` → Rouge + message d'erreur depuis `hrNotes`

**Logique:**
- Si `status` = `error`, affiche `candidate.hrNotes` avec la raison d'échec
- Si `status` = `processing`, montre un spinner

---

### **US2 - Extraction du Texte du CV (BE)**

**Fichier:** [`backend/src/utils/resume-text.ts`](backend/src/utils/resume-text.ts)

**Fonction:** `extractTextFromResume(file, strapi)`

**Processus:**

```
┌─────────────────────────────────┐
│    Resume File (.pdf/.docx/.txt) │
└──────────┬──────────────────────┘
           │
           ├─► PDF ?
           │   └─► pdf-parse (bibliothèque standard)
           │       Si échec → pdfjs-dist (fallback pour PDFs complexes)
           │
           ├─► DOCX ?
           │   └─► mammoth (convertit .docx en texte)
           │
           └─► TXT ?
               └─► Lecture directe du fichier
               
           │
           ▼
    ┌──────────────────┐
    │  Texte brut      │
    │  (avec newlines, │
    │   caractères     │
    │   spéciaux...)   │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────────┐
    │ normalizeExtractedText()
    │ (nettoyage):
    │ • \r\n → \n
    │ • – — → -
    │ • Fusionne lignes hyphenées
    │ • Standardise "Email:" "Phone:"
    │ • Groupe les sections
    │ • Supprime espaces inutiles
    └────────┬─────────────┘
             │
             ▼
    ┌──────────────────────┐
    │ Texte normalisé      │
    │ prêt pour Ollama     │
    └──────────────────────┘
```

**Exemple:**
```
Entrée PDF: "John Doe\nEmail: john@example.com\nPhone: +1234567890"
↓ (normalisation)
Sortie: "John Doe\nEmail: john@example.com\nPhone: +1234567890"
```

---

### **US3 - Analyse du CV via Ollama (BE)**

**Fichier:** [`backend/src/utils/candidate-ai.ts`](backend/src/utils/candidate-ai.ts#L2950) (dans `processCandidate()`)

**Fonction:** `ollamaChat()` avec `PARSER_SYSTEM_PROMPT`

**Prompt système:**
```
"Extract and structure the following resume into JSON format.
Return ONLY valid JSON (no markdown, no extra text).
Structure:
{
  "contact": { fullName, email, phone, location, linkedin, portfolio },
  "skills": ["React", "TypeScript", ...],
  "summary": "Professional summary or objective",
  "experience": [
    { company, title, startDate, endDate, highlights: [] }
  ],
  "education": [
    { school, degree, startDate, endDate }
  ],
  "certifications": [...],
  "projects": [
    { name, description, links: [] }
  ],
  "languages": ["French", "English", ...]
}"
```

**Process:**
1. Appelle Ollama avec le texte du CV
2. Reçoit JSON structuré
3. Si JSON invalide → tente réparation avec `JSON_REPAIR_SYSTEM_PROMPT`
4. Si réparation échoue → utilise extraction heuristique

**Résultat stocké:** `extractedData` dans la base

---

### **US4 - Évaluation Fit Déterministe (BE)**

**Fichier:** [`backend/src/utils/candidate-ai.ts#L2606`](backend/src/utils/candidate-ai.ts#L2606)

**Fonction:** `deterministicEvaluate(requirements, parsed)`

**Algorithme de scoring:**

```
╔════════════════════════════════════════════════════════════════╗
║              FORMULE DE CALCUL DU SCORE                        ║
╚════════════════════════════════════════════════════════════════╝

1. CALCUL FIT SCORE (Compétences + Expérience):
   ───────────────────────────────────────
   requiredCoverage = (skillsMatched / skillsRequired) × 100
   niceToHaveCoverage = (niceToHaveMatched / niceToHave) × 100
   experienceScore = min((yearsHad / yearsRequired) × 100, 100)
   
   fitScore = (requiredCoverage × 75%)
            + (niceToHaveCoverage × 15%)
            + (experienceScore × 10%)

2. CALCUL COMPLÉTUDE SCORE:
   ─────────────────────────
   Points pour chaque champ rempli:
   • fullName: 10 pts
   • email: 15 pts
   • phone: 5 pts
   • location: 5 pts
   • linkedin/portfolio: 5 pts chacun
   • summary: 10 pts
   • experience: 15 pts
   • education: 10 pts
   ...
   Total max: ~100 pts
   
   completenessScore = (pointsObtenu / pointsMax) × 100

3. SCORE FINAL:
   ────────────
   SCORE = (fitScore × 75%) + (completenessScore × 25%)
   
   ⚠️ Pénalités:
   • Pas de fullName/email/skills/experience → score réduit
   • Parse confiance < 70% → score plafonné
   • Parse confiance < 50% → qualityLabel = "poor"

4. CLASSIFICATION:
   ────────────────
   score >= 80  → "excellent"
   score >= 60  → "good"
   score >= 40  → "fair"
   score < 40   → "poor"
```

**Exemple concret:**
```
Offre requiert: React, TypeScript, 3 ans exp.

Candidat:
• Skills: React ✓, TypeScript ✓, Python ✗, Express.js (bonus)
• Expérience: 4 ans ✓
• CV complet: 90/100

requiredCoverage = (2/2) × 100 = 100%
experienceScore = min((4/3) × 100, 100) = 100%
fitScore = (100 × 0.75) + (bonus × 0.15) + (100 × 0.10) = 85

SCORE FINAL = (85 × 0.75) + (90 × 0.25) = 63.75 + 22.5 = 86.25
```

**Résultat stocké:** 
```json
{
  "score": 86.25,
  "breakdown": {
    "fitScore": 85,
    "completenessScore": 90,
    "skillsMatched": ["React", "TypeScript"],
    "skillsMissing": ["Python"],
    "experienceYears": 4
  },
  "qualityLabel": "excellent"
}
```

---

### **US5 - Génération CV Standardisé en Markdown (BE)**

**Fichier:** [`backend/src/utils/cv-templates.ts`](backend/src/utils/cv-templates.ts)

**Fonction:** `renderCvMarkdownFromTemplate(templateKey, contact, content)`

**Templates disponibles:**
- `standard` - Format classique
- `compact` - Version condensée
- `modern` - Design moderne
- `ats` - Optimisé pour les parseurs ATS

**Process de génération:**

```
┌──────────────────────────┐
│ extractedData du candidat │
│ (contact, skills, exp...)  │
└──────────┬───────────────┘
           │
           ├─► templateKey sélectionné
           │
           ▼
    ┌────────────────────────┐
    │ renderCvMarkdownFromTemplate()
    │ (template/standard.ts)
    │
    │ Construit Markdown:
    │ # {fullName}
    │ {email} | {phone} | {location}
    │ LinkedIn: {linkedin}
    │
    │ ## Technical Skills
    │ - React, TypeScript, Node.js
    │
    │ ## Experience
    │ - Company A (2020-2022)
    │   Title: Senior Dev
    │   Description
    │
    │ ## Education
    │ - School: University XYZ
    │   Degree: Master's
    └────────────┬──────────┘
                 │
                 ▼
    ┌──────────────────────────┐
    │ Markdown formaté         │
    │ (1000-3000 caractères)   │
    └──────────────────────────┘
```

**Stocké:** `standardizedCvMarkdown` dans la BDD

---

### **US5 (FE) - Aperçu du CV Standardisé**

**Fichier:** [`frontend/src/app/pages/candidates/candidate-detail.component.ts`](frontend/src/app/pages/candidates/candidate-detail.component.ts)

**Vue:**
```html
<div class="cv-preview" *ngIf="candidate.standardizedCvMarkdown">
  <markdown [data]="candidate.standardizedCvMarkdown"></markdown>
</div>
```

**Logique:**
1. Récupère `standardizedCvMarkdown` du backend
2. Converti Markdown en HTML (via bibliothèque markdown)
3. Affiche avec styling CSS

---

### **US6 - Catalogue de Templates CV (BE)**

**Fichier:** [`backend/src/api/meta/controllers/meta.ts`](backend/src/api/meta/controllers/meta.ts)

**Endpoints:**
```
GET /api/meta/default-template
→ Retourne: { templateKey: "standard" }

PUT /api/meta/default-template
Body: { templateKey: "compact" }
→ Sauvegarde le template par défaut
```

**Données persistées:**
```
Strapi Store:
  key: "cv-templates"
  store: "defaultCvTemplateKey" = "standard"
```

**Templates disponibles (définis dans code):**
```typescript
const CV_TEMPLATES = {
  standard: { name: "Standard", description: "Professional classic format" },
  compact: { name: "Compact", description: "One-page condensed version" },
  modern: { name: "Modern", description: "Contemporary design" },
  ats: { name: "ATS", description: "Optimized for parsers" }
}
```

---

### **US6 (FE) - UI de Sélection de Template**

**Fichier:** [`frontend/src/app/pages/cv-templates/cv-templates.component.ts`](frontend/src/app/pages/cv-templates/cv-templates.component.ts)

**Interface:**
```
┌─────────────────────────────────────┐
│  CV Templates Manager               │
├─────────────┬───────────────────────┤
│ List Panel  │   Preview Panel        │
│ • Standard  │  ┌─────────────────┐   │
│ • Compact   │  │                 │   │
│ • Modern    │  │   CV Preview    │   │
│ • ATS       │  │   (Markdown     │   │
│ (default)   │  │    rendered)    │   │
│             │  │                 │   │
│             │  └─────────────────┘   │
│             │  [Set as Default] Btn  │
└─────────────┴───────────────────────┘
```

**Logique:**
1. Récupère la liste des templates
2. Affiche le template courant en preview
3. Au clic → mise à jour du template par défaut
4. Les nouveaux candidats utilisent ce template

---

### **US7 - Endpoint Conversion HTML vers PDF (BE)**

**Fichier:** [`backend/src/utils/html-pdf.ts`](backend/src/utils/html-pdf.ts)

**Fonction:** `convertHtmlToPdf(html, options)`

**Process:**
```
HTML (Markdown rendu)
    │
    ├─► markdownToHtml() : Markdown → HTML
    │   (Utilise une bibliothèque markdown)
    │
    ├─► Playwright (browser automation)
    │   • Crée une page
    │   • Injecte le HTML
    │   • Génère PDF avec styles CSS
    │
    └─► PDF Buffer
        (Envoyé au client)
```

**Utilisation (exemple):**
```typescript
const html = `
  <h1>Jean Dupont</h1>
  <p>Email: jean@example.com</p>
  <ul><li>React</li></ul>
`;

const pdfBuffer = await convertHtmlToPdf(html, {
  format: 'A4',
  margin: { top: '1cm', bottom: '1cm' }
});
// pdfBuffer → envoyé en réponse avec Content-Type: application/pdf
```

---

### **US7 (FE) - Bouton Téléchargement du CV**

**Fichier:** [`frontend/src/app/pages/candidates/candidate-detail.component.ts`](frontend/src/app/pages/candidates/candidate-detail.component.ts)

**Bouton:**
```html
<button (click)="downloadCvPdf()">
  <svg>Download PDF</svg>
</button>
```

**Logique:**
```typescript
downloadCvPdf() {
  // Appelle le backend pour convertir standardizedCvMarkdown en PDF
  this.candidateService.downloadCvPdf(this.candidate.id).subscribe(
    (pdfBlob) => {
      // Crée un lien de téléchargement
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.candidate.fullName}_CV.pdf`;
      a.click();
    }
  );
}
```

**Flux HTTP:**
```
Frontend: GET /api/candidates/{id}/download-cv
    ↓
Backend: 
  • Récupère standardizedCvMarkdown
  • convertHtmlToPdf(markdown)
  • Retourne PDF avec header Content-Type: application/pdf
    ↓
Frontend: 
  • Télécharge le fichier
  • L'utilisateur peut l'ouvrir/sauvegarder
```

---

### **US8 - Logique de Retrait (BE)**

**Fichier:** [`backend/src/api/candidate/controllers/candidate.ts`](backend/src/api/candidate/controllers/candidate.ts)

**Logique de transition d'état valides:**
```javascript
const VALID_STATUS_TRANSITIONS = {
  new:        ['processing', 'rejected'],
  processing: ['processed', 'error'],
  processed:  ['reviewing', 'rejected'],
  reviewing:  ['shortlisted', 'rejected'],
  shortlisted:['hired', 'rejected'],
  rejected:   [], // ✗ Terminal - pas de transition
  hired:      [], // ✗ Terminal - pas de transition
  error:      ['processing']  // ✓ Réessayer
};
```

**Endpoint retrait (hypothétique):**
```
PUT /api/candidates/{id}
Body: { status: "rejected" }
```

**Validation:**
```typescript
if (!VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus)) {
  // Erreur 400 - transition invalide
  return { error: "Invalid status transition" };
}
```

---

### **US8 (FE) - Bouton Retrait avec Confirmation**

**Fichier:** [`frontend/src/app/pages/candidates/candidate-detail.component.ts`](frontend/src/app/pages/candidates/candidate-detail.component.ts)

**Bouton:**
```html
<button class="btn-reject" (click)="openRejectConfirm()">
  <svg>Reject Candidate</svg>
</button>

<div class="modal" *ngIf="showRejectModal">
  <h3>Confirm Rejection</h3>
  <p>Are you sure? This cannot be undone.</p>
  <button (click)="rejectCandidate()">Yes, Reject</button>
  <button (click)="closeRejectModal()">Cancel</button>
</div>
```

**Logique:**
```typescript
rejectCandidate() {
  this.candidateService.updateStatus(this.candidate.id, 'rejected')
    .subscribe(
      (result) => {
        this.candidate.status = 'rejected';
        this.showRejectModal = false;
        this.showMessage('Candidate rejected successfully');
      },
      (error) => this.showError(error.message)
    );
}
```

---

## 🔗 Flux de Données Complet (Un Candidat)

```
1. USER UPLOADS CV
   Frontend: POST /api/candidates (FormData + resume file)
   Backend: Strapi reçoit le fichier

2. DATABASE
   ├─ fullName: "Jean Dupont"
   ├─ email: "jean@example.com"
   ├─ resume: { url: "/uploads/cv.pdf" }
   ├─ status: "new"
   └─ job_posting: 1 (relation)

3. TRIGGER PIPELINE
   Backend: processCandidate(candidateId) automatique
   Status: "new" → "processing"

4. EXTRACTION [US2]
   ├─ Lit PDF/DOCX/TXT
   ├─ Extrait texte brut
   └─ Normalise

5. PARSING IA [US3]
   ├─ Ollama analyse le texte
   ├─ JSON structuré
   └─ Stocké: extractedData

6. ÉVALUATION [US4]
   ├─ Scores calculés
   ├─ Skills matchés
   └─ Stocké: score, evaluation

7. GÉNÉRATION CV [US5]
   ├─ Template sélectionné
   ├─ Markdown généré
   └─ Stocké: standardizedCvMarkdown

8. DATABASE UPDATE
   ├─ status: "processed"
   ├─ score: 86.25
   ├─ extractedData: {...}
   └─ standardizedCvMarkdown: "# Jean..."

9. FRONTEND DISPLAY
   ├─ Liste candidats: statut, score
   ├─ Détail candidat: CV, breakdown évaluation
   └─ Boutons: télécharger PDF, retirer, évaluer

10. USER ACTIONS (US7 & US8)
    ├─ Télécharger PDF → convertHtmlToPdf()
    └─ Retirer → updateStatus('rejected')
```

---

## 📁 Structure des Fichiers Clés

```
backend/
├─ src/
│  ├─ api/
│  │  ├─ candidate/
│  │  │  ├─ controllers/candidate.ts      [US1 - Orchestration]
│  │  │  ├─ services/candidate.ts        [Re-exports utils]
│  │  │  ├─ routes/candidate.ts          [Endpoints REST]
│  │  │  └─ content-types/candidate/schema.json [Model]
│  │  └─ meta/
│  │     ├─ controllers/meta.ts          [US6 - Templates]
│  │     └─ routes/meta.ts               [GET/PUT default-template]
│  └─ utils/
│     ├─ candidate-ai.ts                 [processCandidate, deterministic evaluate]
│     ├─ resume-text.ts                  [US2 - Text extraction]
│     ├─ cv-templates.ts                 [US5 & US6 - Template rendering]
│     ├─ html-pdf.ts                     [US7 - HTML to PDF]
│     ├─ ollama.ts                       [IA wrapper]
│     └─ json.ts                         [JSON parsing + recovery]

frontend/
├─ src/
│  └─ app/
│     ├─ pages/
│     │  ├─ candidates/
│     │  │  ├─ candidates-list.component.ts   [US1 - Status indicator]
│     │  │  └─ candidate-detail.component.ts  [US5, US7, US8 - Preview, PDF, Reject]
│     │  ├─ ai-evaluation/
│     │  │  └─ ai-evaluation.component.ts      [Détails score]
│     │  └─ cv-templates/
│     │     └─ cv-templates.component.ts       [US6 - Template selector]
│     └─ services/
│        └─ candidate.service.ts          [HTTP calls to backend]
```

---

## 🔄 Exemple Complet d'Exécution

### Scénario: Candidat postule avec CV PDF

**Étape 1: Upload CV**
```
User (Frontend) → POST /api/candidates
{
  fullName: "Alice Martin",
  email: "alice@example.com",
  resume: <PDF File>,
  job_posting: 5
}

↓ Strapi

Database:
{
  id: 42,
  fullName: "Alice Martin",
  status: "new",
  resume: { url: "/uploads/resume.pdf" }
}

Frontend: Affiche "New" badge (gris)
```

**Étape 2: Pipeline Lancé**
```
Backend: processCandidate(42) automatique

Timeline:
  0ms:   Status = "processing"  → Frontend: Spinner affiche
  500ms:  Extraction texte OK
  1000ms: Ollama parsing...
  2500ms: Evaluation calculée
  3000ms: CV généré en Markdown
  3100ms: Status = "processed"  → Frontend: Badge vert
```

**Étape 3: Données Visibles dans le Frontend**

Détail candidat affiche:
```
Alice Martin
alice@example.com

AI Score: 78.5/100
Status: ✓ Processed

Skills Matched:
• React
• TypeScript

Missing:
• Kubernetes

Resume Preview:
───────────────
# Alice Martin
Email: alice@example.com
Technical Skills: React, TypeScript, ...

Experience
Company A (2020-2022)
...
───────────────

[Download PDF] [Reject ✗]
```

**Étape 4: User télécharge PDF**
```
User clicks [Download PDF]

→ Frontend appelle: GET /api/candidates/42/download-cv

→ Backend:
   1. Récupère standardizedCvMarkdown
   2. convertHtmlToPdf()
   3. Retourne PDF Buffer

→ Frontend:
   1. Crée blob URL
   2. Simule click sur <a href>
   3. File téléchargée: "Alice Martin_CV.pdf"
```

**Étape 5: User rejette la candidature**
```
User clicks [Reject ✗]

→ Confirmation Modal: "Êtes-vous sûr?"

→ User confirms

→ Frontend: PUT /api/candidates/42
   Body: { status: "rejected" }

→ Backend:
   Valide transition: processed → rejected ✓
   Update candidate

→ Database: status = "rejected" (Terminal)

→ Frontend: Badge rouge "Rejected"
```

---

## 📊 Diagramme de Flux Complet

```
                                 START: CV Upload
                                      │
                                      ▼
                         ┌────────────────────────┐
                         │  User uploads CV       │
                         │  Frontend → POST API   │
                         └────────────┬───────────┘
                                      │
                                      ▼
                         ┌────────────────────────┐
                         │  Strapi receives       │
                         │  Status: "new"         │
                         └────────────┬───────────┘
                                      │
         ┌────────────────────────────┴─────────────────────┐
         │                                                   │
         ▼                                                   │
    [BACKEND PIPELINE]                                      │
    ┌────────────────┐                                      ▼
    │  Extract Text  │  US2                        [FRONTEND]
    │  (PDF/DOCX/TXT)│────┐                    Status indicator
    └────────┬───────┘    │                    "new" (grey)
             │            ├─► Processing status
             ▼            │   "processing" (spinner)
    ┌────────────────┐    │
    │ Ollama Parse   │  US3│   User sees candidate
    │ (JSON struct)  │    │   but processing...
    └────────┬───────┘    │
             │            │
             ▼            │
    ┌────────────────┐    │
    │ Deterministic  │  US4│
    │ Evaluate       │    │
    │ (Fit Score)    │    │
    └────────┬───────┘    │
             │            │
             ▼            │
    ┌────────────────┐    │
    │ Generate CV    │  US5│
    │ (Markdown)     │    │
    └────────┬───────┘    │
             │            │
             ▼            │
    ┌────────────────┐    │
    │ Update DB      │    │
    │ status:        │────┘
    │ "processed"    │
    └────────┬───────┘
             │
             ▼
      [FRONTEND UPDATED]
      Status badge: "processed" ✓
      Score display: 78.5/100
      CV Preview shown
      │
      ├─► User clicks [Download PDF]  ──► US7: convertHtmlToPdf()
      │                                   → PDF downloaded
      │
      └─► User clicks [Reject ✗]  ──► US8: updateStatus('rejected')
                                       → Status = "rejected" (terminal)
                                       → Badge: "rejected"
```

---

## 🎯 Résumé: Les 8 US et Où les Trouver

| US | Description | Backend | Frontend |
|----|-------------|---------|----------|
| **US1** | Orchestration pipeline | `candidate.controller.ts` | `candidates-list.component.ts` |
| **US1 FE** | Indicateur statut/erreurs | N/A | `candidates-list.component.ts` |
| **US2** | Extract CV text | `resume-text.ts` | N/A |
| **US3** | Parse CV with Ollama | `candidate-ai.ts` (parseResume) | N/A |
| **US4** | Evaluate fit | `candidate-ai.ts` (deterministicEvaluate) | N/A |
| **US5** | Generate CV Markdown | `cv-templates.ts` (renderCvMarkdown) | `candidate-detail.component.ts` |
| **US5 FE** | CV Preview | N/A | `candidate-detail.component.ts` |
| **US6** | Template catalog | `meta.controller.ts` | N/A |
| **US6 FE** | Template selector UI | N/A | `cv-templates.component.ts` |
| **US7** | HTML to PDF endpoint | `html-pdf.ts` (convertHtmlToPdf) | `candidate-detail.component.ts` |
| **US7 FE** | Download PDF button | N/A | `candidate-detail.component.ts` |
| **US8** | Withdrawal logic | `candidate.controller.ts` (validateTransition) | N/A |
| **US8 FE** | Reject with confirmation | N/A | `candidate-detail.component.ts` |

---

## 🔐 Sécurité & Validations

### Backend:
- ✅ Validation MIME types PDF/DOCX/TXT
- ✅ Limite taille fichier 5MB
- ✅ Timeouts Ollama (120s parse, 180s generate)
- ✅ Transitions d'état contrôlées
- ✅ JSON parsing avec recovery

### Frontend:
- ✅ Confirmation modale pour rejeter candidat
- ✅ JWT token dans chaque requête (interceptor)
- ✅ Auth guard sur pages RH
- ✅ Validation email

---

## 📚 Technologies Utilisées

```
Backend:
- Strapi (API REST + CMS)
- Ollama (IA locale)
- pdf-parse / pdfjs-dist (PDF extraction)
- mammoth (DOCX parsing)
- Playwright (HTML to PDF)
- PostgreSQL (Database)

Frontend:
- Angular 17+ (Standalone components)
- RxJS (Async)
- TypeScript
```

---

## ✅ Checklist de Compréhension

- [ ] Comprends le flux d'upload du CV
- [ ] Peux expliquer la pipeline AI (7 étapes)
- [ ] Sais où chercher le code d'extraction de texte
- [ ] Comprends comment Ollama structure le JSON
- [ ] Peux expliquer la formule de score
- [ ] Connais les 4 templates de CV
- [ ] Sais comment ça se connecte du backend au frontend
- [ ] Peux tracer une candidature de "new" à "processed"
- [ ] Comprends les transitions d'état valides
- [ ] Sais comment le PDF est généré et téléchargé

Bon courage! 🚀
