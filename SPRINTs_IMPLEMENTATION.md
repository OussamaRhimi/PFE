# SPRINTS_IMPLEMENTATION

Ce document decrit pas a pas l implementation complete de tous les sprints. Il explique le raisonnement et pointe vers le code cle (back et front). Le contenu est base sur le monorepo actuel.

## Vue d ensemble

Architecture cible :
- Backend : Strapi (API REST, validation, logique metier).
- Frontend : Angular (pages RH + portail public).
- IA : Ollama pour parsing/generation CV, utils maison pour robustesse JSON.
- Export : Playwright pour PDF a partir du rendu HTML des templates.

Objectif produit :
- Portail public : consulter les offres ouvertes, postuler, suivre, retirer, obtenir des recommandations, parler avec un assistant.
- Portail RH : gerer le referentiel (skills, departments), les offres, les candidats, l evaluation IA et les analytics.

---

## Sprint 1 — Fondations RH + CRUD de base

### Etape 1 — Modeles Strapi (schema stables)
Raison : etablir un schema stable pour toutes les entites utilisees ensuite (front et back).

Fichiers :
- `backend/src/api/skill/content-types/skill/schema.json`
- `backend/src/api/department/content-types/department/schema.json`
- `backend/src/api/job-posting/content-types/job-posting/schema.json`

Extraits :
```json
// skill/schema.json
"name": { "type": "string", "required": true, "unique": true, "minLength": 1, "maxLength": 255 }
```
```json
// department/schema.json
"name": { "type": "text", "unique": true }
```
```json
// job-posting/schema.json
"requirements": { "type": "json", "required": false },
"status": { "type": "enumeration", "required": true, "default": "draft", "enum": ["draft", "open", "closed"] }
```

### Etape 2 — Recherche rapide (autocomplete)
Raison : alimenter les autocompletes et eviter de charger trop de donnees cote front.

Fichiers :
- `backend/src/api/skill/controllers/skill.ts`
- `backend/src/api/department/controllers/department.ts`

Extraits :
```ts
// skill.ts (find surcharge)
const results = await strapi.entityService.findMany('api::skill.skill', {
  filters: { name: { $containsi: String(searchTerm).trim() } },
  fields: ['id', 'name'],
  sort: { name: 'asc' },
});
```
```ts
// department.ts (search)
const results = await strapi.entityService.findMany('api::department.department', {
  filters: { name: { $containsi: String(q).trim() } },
  fields: ['id', 'name'],
  limit: safeLimit,
  sort: { name: 'asc' },
});
```

### Etape 3 — Auth RH (login + guard + token)
Raison : securiser toutes les pages RH avec un JWT Strapi.

Fichiers :
- `frontend/src/app/services/auth.service.ts`
- `frontend/src/app/guards/auth.guard.ts`
- `frontend/src/app/interceptors/token.interceptor.ts`

Extraits :
```ts
// auth.service.ts
login(credentials: LoginRequest) {
  return this.http.post<AuthResponse>(`${this.API_URL}/auth/local`, credentials).pipe(
    tap((response) => {
      localStorage.setItem('token', response.jwt);
      localStorage.setItem('user', JSON.stringify(response.user));
      this.currentUserSubject.next(response.user);
    })
  );
}
```
```ts
// auth.guard.ts
if (!authService.isLoggedIn()) {
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
}
```
```ts
// token.interceptor.ts
const token = this.authService.getToken();
if (token) {
  request = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
```

### Etape 4 — Routing RH et dashboard
Raison : point d entree unique et navigation claire entre modules.

Fichier :
- `frontend/src/app/app.routes.ts`

Extrait :
```ts
{ path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
{ path: 'skills', component: SkillsComponent, canActivate: [authGuard] },
{ path: 'departments', component: DepartmentsComponent, canActivate: [authGuard] },
{ path: 'job-postings', component: JobPostingsComponent, canActivate: [authGuard] }
```

### Etape 5 — CRUD Skills (RH)
Raison : disposer d un referentiel de competences reutilisable (exigences, filtres).

Fichiers :
- `frontend/src/app/services/skill.service.ts`
- `frontend/src/app/pages/skills/skills.component.ts`

Extraits :
```ts
// skill.service.ts
create(name: string) {
  return this.http.post<StrapiSkillResponse>(this.API_URL, { data: { name } }).pipe(
    map(res => res.data)
  );
}
```
```ts
// skills.component.ts
this.skillService.create(name).subscribe({
  next: (skill) => { this.skills.push(skill); }
});
```

### Etape 6 — CRUD Departments (RH)
Raison : structurer l organisation et fournir des filtres par departement.

Fichiers :
- `frontend/src/app/services/department.service.ts`
- `frontend/src/app/pages/departments/departments.component.ts`

Extrait :
```ts
this.departmentService.create(name).subscribe({
  next: (dept) => {
    this.departments.push(dept);
    this.filteredDepartments = [...this.departments];
  }
});
```

### Etape 7 — CRUD Job Postings + requirements JSON
Raison : pouvoir decrire une offre avec des exigences structurees.

Fichiers :
- `frontend/src/app/services/job-posting.service.ts`
- `frontend/src/app/pages/job-postings/job-posting-form.component.ts`

Extraits :
```ts
// job-posting.service.ts
create(payload: JobPostingPayload) {
  return this.http.post<StrapiSingle<JobPosting>>(this.apiUrl, { data: payload }).pipe(
    map(res => this.normalizeJob(res?.data))
  );
}
```
```ts
// job-posting-form.component.ts
const payload: JobPostingPayload = {
  ...this.form,
  requirements: { ...this.reqs },
};
const obs = this.isEdit
  ? this.jobService.update(this.documentId, payload)
  : this.jobService.create(payload);
```

---

## Sprint 2 — Candidature publique + GDPR + RH candidates

### Etape 1 — Endpoint public des offres ouvertes
Raison : exposer uniquement les offres ouvertes pour le portail public.

Fichiers :
- `backend/src/api/job-posting/controllers/job-posting.ts`
- `backend/src/api/job-posting/routes/job-posting-status.ts`

Extraits :
```ts
// job-posting.ts
async findOpen(ctx) {
  ctx.query = {
    ...ctx.query,
    filters: { ...(ctx.query.filters as any || {}), status: { $eq: 'open' } },
  };
  const result = await super.find(ctx);
  return result;
}
```
```ts
// job-posting-status.ts
{ method: 'GET', path: '/job-postings/public', handler: 'job-posting.findOpen', config: { auth: false } }
```

### Etape 2 — Page publique des offres
Raison : afficher les offres ouvertes avec recherche locale et presentation en cards.

Fichiers :
- `frontend/src/app/pages/public-jobs/public-job-list.component.ts`
- `frontend/src/app/services/job-posting.service.ts`

Extraits :
```ts
// job-posting.service.ts
getPublicJobs(): Observable<JobPosting[]> {
  return this.http.get<StrapiResponse<JobPosting>>(`${this.apiUrl}/public`).pipe(
    map(res => this.normalizeList(res?.data))
  );
}
```
```ts
// public-job-list.component.ts
this.jobService.getPublicJobs().subscribe({
  next: (data) => { this.jobs = data; this.applyFilter(); }
});
```

### Etape 3 — Candidature + upload CV (validation server + client)
Raison : securiser le flux et garantir la qualite des fichiers.

Fichiers :
- `backend/src/api/candidate/controllers/candidate.ts`
- `frontend/src/app/pages/public-jobs/apply.component.ts`

Back-end (validation) :
```ts
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const MAX_FILE_SIZE_MB = 5;

if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
  return ctx.badRequest(`Invalid file type "${mimeType}". Allowed: PDF, DOCX, TXT.`);
}
if (fileSizeMB > MAX_FILE_SIZE_MB) {
  return ctx.badRequest(`File too large (${fileSizeMB.toFixed(1)} MB). Maximum: ${MAX_FILE_SIZE_MB} MB.`);
}
```
Front-end (validation client) :
```ts
private readonly ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
private readonly MAX_SIZE_MB = 5;

if (!this.ALLOWED_TYPES.includes(file.type)) {
  this.fileError = this.i18n.t('apply.fileTypeError');
  return;
}
if (file.size / (1024 * 1024) > this.MAX_SIZE_MB) {
  this.fileError = this.i18n.t('apply.fileSizeError');
  return;
}
```

### Etape 4 — GDPR : consentement et retention
Raison : tracer legalement le consentement et fixer une date de retention.

Fichiers :
- `backend/src/api/candidate/controllers/candidate.ts`
- `backend/src/api/candidate/content-types/candidate/schema.json`
- `frontend/src/app/pages/public-jobs/apply.component.ts`

Back-end :
```ts
const RETENTION_MONTHS = 24;
const now = new Date();
const retentionUntil = addMonths(now, RETENTION_MONTHS);

const candidate = await strapi.documents('api::candidate.candidate').create({
  data: {
    consent: true,
    consentAt: now.toISOString(),
    retentionUntil: retentionUntil.toISOString(),
  },
});
```
Schema :
```json
"consent": { "type": "boolean", "required": true, "default": false },
"consentAt": { "type": "datetime" },
"retentionUntil": { "type": "datetime" }
```
Front-end :
```ts
if (!this.form.consent) {
  return; // blocage de la soumission
}
```

### Etape 5 — Suivi candidature par email (code)
Raison : permettre un suivi sans compte, tout en gardant la securite.

Fichiers :
- `backend/src/api/candidate/controllers/candidate.ts`
- `frontend/src/app/pages/public-jobs/track.component.ts`

Back-end (generation code + hash + expiration) :
```ts
const TRACKING_CODE_TTL_MINUTES = 15;
const code = generateVerificationCode();
const codeHash = hashVerificationCode(email, code);
const expiresAt = new Date(Date.now() + TRACKING_CODE_TTL_MINUTES * 60 * 1000).toISOString();
```
Front-end (flow 3 etapes) :
```ts
sendCode(): void {
  this.candidateService.requestTrackingCode(this.email.trim()).subscribe({
    next: () => { this.step = 'code'; },
  });
}
verifyCode(): void {
  this.candidateService.verifyTrackingCode(this.email.trim(), this.code.trim()).subscribe({
    next: (res) => { this.step = 'list'; this.applications = res.applications; },
  });
}
```

### Etape 6 — Retrait GDPR (delete par token)
Raison : suppression self-service des donnees et du fichier CV.

Fichiers :
- `backend/src/api/candidate/controllers/candidate.ts`
- `frontend/src/app/pages/public-jobs/withdraw.component.ts`

Back-end :
```ts
const results = await strapi.documents('api::candidate.candidate').findMany({
  filters: { publicToken: { $eq: token } },
  populate: ['resume'],
});

if ((candidate as any).resume?.id) {
  await strapi.plugin('upload').service('upload').remove((candidate as any).resume);
}

await strapi.documents('api::candidate.candidate').delete({ documentId: candidate.documentId });
```
Front-end :
```ts
this.candidateService.withdraw(this.token).subscribe({
  next: () => { this.deleted = true; },
});
```

### Etape 7 — Listing RH des candidats (pagination + filtres)
Raison : faciliter le tri et la gestion d un volume de candidatures.

Fichiers :
- `backend/src/api/candidate/controllers/candidate.ts`
- `frontend/src/app/services/candidate.service.ts`

Back-end :
```ts
const filters: any = {};
if (status) filters.status = { $eq: status };
if (jobPostingId) filters.job_posting = { documentId: jobPostingId };
if (search) filters.$or = [
  { fullName: { $containsi: search } },
  { email: { $containsi: search } },
];

const candidates = await strapi.documents('api::candidate.candidate').findMany({
  filters,
  sort: sortConfig,
  limit: Number(pageSize),
  start: (Number(page) - 1) * Number(pageSize),
});
```
Front-end :
```ts
this.candidateService.getAllHr(this.currentPage, this.pageSize, sortParam, filters).subscribe({
  next: (res) => {
    this.candidates = res.data;
    this.totalCount = res.meta.pagination.total;
  },
});
```

### Etape 8 — Detail candidat RH + download CV
Raison : acces complet aux donnees et au CV pour la decision RH.

Fichiers :
- `backend/src/api/candidate/controllers/candidate.ts`
- `frontend/src/app/pages/candidates/candidate-detail.component.ts`

Back-end :
```ts
const candidate = await strapi.documents('api::candidate.candidate').findOne({
  documentId: id,
  populate: ['job_posting', 'resume'],
});

const filePath = path.join(uploadsDir, 'uploads', resume.hash + resume.ext);
ctx.set('Content-Type', resume.mime || 'application/octet-stream');
ctx.set('Content-Disposition', `attachment; filename="${filename}"`);
ctx.body = fileBuffer;
```
Front-end :
```ts
getResumeDownloadUrl(id: string): string {
  return `${this.apiUrl}/hr/${id}/resume`;
}
```

### Etape 9 — Transitions de statut (workflow valide)
Raison : eviter les statuts incoherents.

Fichier :
- `backend/src/api/candidate/controllers/candidate.ts`

Extrait :
```ts
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['processing', 'rejected'],
  processing: ['processed', 'error'],
  processed: ['reviewing', 'rejected'],
  reviewing: ['shortlisted', 'rejected'],
  shortlisted: ['hired', 'rejected'],
  rejected: [],
  hired: [],
  error: ['processing'],
};

if (!allowedTransitions.includes(newStatus)) {
  return ctx.badRequest(`Cannot transition from "${currentStatus}" to "${newStatus}".`);
}
```

### Etape 10 — Notes RH
Raison : garder un historique interne par candidat.

Fichier :
- `backend/src/api/candidate/controllers/candidate.ts`

Extrait :
```ts
if (hrNotes === undefined) {
  return ctx.badRequest('hrNotes field is required.');
}
const updated = await strapi.documents('api::candidate.candidate').update({
  documentId: id,
  data: { hrNotes: hrNotes?.trim() || null },
});
```

---

## Sprint 3 — Pipeline IA + CV standardise

### Etape 1 — Enrichissement du schema candidat
Raison : stocker les donnees extraites, le CV standardise et le template.

Fichier :
- `backend/src/api/candidate/content-types/candidate/schema.json`

Extrait :
```json
"extractedData": { "type": "json" },
"standardizedCvMarkdown": { "type": "text" },
"cvTemplateKey": { "type": "enumeration", "enum": ["standard","experience_first","skills_first","compact","education_first","project_focus","sidebar_photo","accent_pink","teal_circle","navy_gold","sunset"], "default": "standard" }
```

### Etape 2 — Extraction texte CV (PDF, DOCX, TXT)
Raison : normaliser le texte brut pour le parsing.

Fichier :
- `backend/src/utils/resume-text.ts`

Extrait :
```ts
if (mime.includes('pdf') || ext === '.pdf') {
  return normalizeExtractedText(await extractPdfText(buffer));
}
if (mime.includes('officedocument') || mime.includes('wordprocessingml') || ext === '.docx') {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return normalizeExtractedText(result.value);
}
if (mime.startsWith('text/') || ext === '.txt') {
  return normalizeExtractedText(buffer.toString('utf8'));
}
```

### Etape 3 — Robustesse JSON (LLM)
Raison : gerer les sorties LLM imparfaites (code fences, trailing commas, JSON partiel).

Fichier :
- `backend/src/utils/json.ts`

Extrait :
```ts
export function parseJsonWithRecovery<T = unknown>(text: string): JsonParseRecovery<T> {
  const candidates = [raw, stripMarkdownCodeFence(raw), extractLikelyJsonObject(raw) ?? '', repairLikelyJson(raw)];
  for (const candidate of candidates) {
    try { return { ok: true, value: JSON.parse(candidate) as T, recovered: candidate !== raw.trim() }; }
    catch {}
  }
  return { ok: false, error: new Error('Failed to parse JSON response.') };
}
```

### Etape 4 — Integration Ollama
Raison : centraliser l appel LLM et forcer le format JSON.

Fichier :
- `backend/src/utils/ollama.ts`

Extrait :
```ts
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

const chatResponse = await fetch(`${apiBase}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: options.model || OLLAMA_MODEL, messages, stream: false, format: options.format }),
  signal: controller.signal,
});
```

### Etape 5 — Pipeline IA complet (processCandidate)
Raison : orchestrer extraction, parsing, scoring, generation et sauvegarde.

Fichier :
- `backend/src/utils/candidate-ai.ts`

Pas a pas :
1. Charger le candidat + CV + job posting.
2. Extraire le texte CV et le normaliser.
3. Parser via Ollama (et reparer le JSON si besoin).
4. Appliquer un parsing heuristique puis fusionner.
5. Evaluer deterministiquement (skills, experience, completeness).
6. Generer un contenu de CV propre via Ollama.
7. Rendre le template HTML/Markdown.
8. Sauvegarder le tout + status.

Extrait :
```ts
const cvTextRaw = await extractTextFromResume(resume as any, strapi);
const cvText = normalizeCvText(cvTextRaw);
const parserRaw = await ollamaChat({ system: PARSER_SYSTEM_PROMPT, user: cvForModel, format: 'json' });
const parsedModel = parseModelJson<Record<string, unknown>>(parserRaw);
const heuristicParsed = parseResumeHeuristic(cvText);
const parsed = normalizeParsedData(mergeParsedData(parsedModel.value, heuristicParsed));

const evaluation = deterministicEvaluate(candidate.job_posting?.requirements ?? {}, parsed, {
  linkedin: candidate.linkedin ?? undefined,
  portfolio: candidate.portfolio ?? undefined,
});

const generatedRaw = await ollamaChat({ system: GENERATOR_SYSTEM_PROMPT, user: generatorInput, format: 'json' });
const resumeContent = normalizeGeneratedResumeContent(parseModelJson<ResumeContent>(generatedRaw).value);
const markdown = renderCvMarkdownFromTemplate(templateKey, contact, resumeContent);

await strapi.entityService.update('api::candidate.candidate', candidateId, {
  data: { status: 'processed', extractedData: { ...parsed, evaluation }, standardizedCvMarkdown: markdown, score: evaluation.score },
});
```

### Etape 6 — Scoring deterministe et config
Raison : garantir un score reproductible et ajustable.

Fichier :
- `backend/src/utils/candidate-ai.ts`

Points cles :
- Poids configurables : fit/completeness.
- Matching skills avec alias et ecosystemes.
- Completeness base sur presence des sections.
- Label qualite (excellent/good/fair/poor).

Extrait :
```ts
const evaluationConfig = mergeEvaluationConfig((requirementsObj as any).evaluationConfig);
const requiredCoverage = requiredSkills.length > 0
  ? ((skillsMatchedBase.length + ecosystemBonus) / requiredSkills.length) * 100
  : 100;
const fitScore = (requiredCoverage * reqWeight) + (niceToHaveCoverage * niceWeight) + (experienceComposite * expWeight);
const completenessScore = calculateCompletenessScore(parsed, contact, evaluationConfig.completenessPoints, candidateMeta);
let score = (fitScore * fitWeight) + (completenessScore * completenessWeight);
```

### Etape 7 — Templates CV (catalogue + rendu)
Raison : standardiser les CVs avec plusieurs styles.

Fichier :
- `backend/src/utils/cv-templates.ts`

Extrait :
```ts
export const CV_TEMPLATES: CvTemplateMeta[] = [
  { key: 'standard', name: 'Standard (Blue)', description: 'Clean single-column with blue accents.' },
  { key: 'experience_first', name: 'Modern (Accent Header)', description: 'Gradient header band + crisp sections.' },
  // total 11 templates
];

export function renderCvMarkdownFromTemplate(templateKey: CvTemplateKey, contact: ResumeContact, content: ResumeContent): string {
  switch (templateKey) {
    case 'standard': return renderStandardTemplate(contact, content);
    case 'experience_first': return renderExperienceFirstTemplate(contact, content);
    // ...
    default: return renderStandardTemplate(contact, content);
  }
}
```

### Etape 8 — Preview HTML + export PDF
Raison : afficher un rendu web et fournir un PDF telechargeable.

Fichiers :
- `backend/src/utils/html-pdf.ts`
- `backend/src/api/candidate/controllers/candidate.ts`

Extrait :
```ts
const pdf = await page.pdf({
  format: 'A4',
  margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
  printBackground: true,
});
return Buffer.from(pdf);
```

### Etape 9 — Endpoints IA (templates, preview, reprocess, process)
Raison : exposer les fonctionnalites IA au front RH.

Fichier :
- `backend/src/api/candidate/routes/candidate-public.ts`

Extrait :
```ts
{ method: 'GET', path: '/cv-templates', handler: 'candidate.listCvTemplates' },
{ method: 'GET', path: '/cv-templates/preview', handler: 'candidate.previewCvTemplate' },
{ method: 'GET', path: '/candidates/:id/cv-preview', handler: 'candidate.getCvPreview' },
{ method: 'PUT', path: '/candidates/:id/reprocess', handler: 'candidate.reprocess' },
{ method: 'POST', path: '/candidates/:id/process', handler: 'candidate.triggerProcess' }
```

### Etape 10 — UI RH : CV preview + templates + reprocess
Raison : permettre aux RH d inspecter, reprocesser et changer de template.

Fichiers :
- `frontend/src/app/pages/candidates/candidate-detail.component.ts`
- `frontend/src/app/pages/cv-templates/cv-templates.component.ts`
- `frontend/src/app/services/candidate.service.ts`

Extraits :
```ts
// candidate-detail.component.ts
this.candidateService.getCvPreview(id, key).subscribe({
  next: (preview) => { this.cvPreview = preview; },
});
```
```ts
// candidate.service.ts
getCvPdfDownloadUrl(id: string, token?: string): string {
  const base = `${this.apiUrl}/${id}/cv-pdf`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}
```

---

## Sprint 4 — Evaluation avancee + analytics + IA publique

### Etape 1 — Configuration d evaluation par offre
Raison : adapter le scoring selon chaque poste.

Fichiers :
- `backend/src/api/job-posting/controllers/job-posting.ts`
- `backend/src/api/job-posting/routes/hr-job-posting.ts`
- `frontend/src/app/pages/ai-evaluation/ai-evaluation.component.ts`

Extraits :
```ts
// backend hrGetEvalConfig
const raw = jp.requirements?.evaluationConfig ?? null;
ctx.body = { evaluationConfig: mergeEvaluationConfig(raw), defaults: DEFAULT_EVALUATION_CONFIG };
```
```ts
// frontend service
getEvalConfig(id: string | number) {
  return this.http.get(`http://localhost:1337/api/hr/job-postings/${id}/eval-config`);
}
```

### Etape 2 — Filtrage score + bulk status
Raison : traiter rapidement des lots de candidats.

Fichiers :
- `backend/src/api/candidate/controllers/candidate.ts`
- `frontend/src/app/services/candidate.service.ts`

Extraits :
```ts
const scoreNumber = Math.min(100, Math.max(0, scoreNumberRaw));
const op = scoreOp === 'lt' ? '$lt' : '$gt';
filters.score = { $notNull: true, [op]: scoreNumber };
```
```ts
return this.http.post(`${this.apiUrl}/hr/bulk-status`, { ids, status });
```

### Etape 3 — Analytics RH (charts + KPIs)
Raison : donner une vue globale du pipeline.

Fichiers :
- `frontend/src/app/pages/analytics/analytics.component.ts`
- `backend/src/api/meta/controllers/meta.ts`

Extraits :
```ts
// meta controller
ctx.body = {
  jobPostingStatuses: Array.isArray(jobPostingStatuses) ? jobPostingStatuses : [],
  candidateStatuses: Array.isArray(candidateStatuses) ? candidateStatuses : [],
};
```
```ts
const meta = await firstValueFrom(this.http.get('http://localhost:1337/api/meta'));
const [jobs, candidates] = await Promise.all([
  firstValueFrom(this.jobPostingService.getAll()),
  firstValueFrom(this.candidateService.listForAnalytics()),
]);
```

### Etape 4 — Recommandations publiques (IA)
Raison : proposer les offres les plus compatibles a partir d un CV.

Fichiers :
- `backend/src/api/candidate/controllers/candidate.ts`
- `frontend/src/app/pages/public-jobs/recommendation.component.ts`

Extrait (backend) :
```ts
const openJobs = await strapi.entityService.findMany('api::job-posting.job-posting', {
  filters: { status: 'open' },
  fields: ['title', 'description', 'requirements'],
  sort: { createdAt: 'desc' },
  limit: 200,
});
// extractTextFromResume -> ollamaChat -> matching -> compatibility
```

### Etape 5 — Chatbot public
Raison : assistance rapide aux candidats (FAQ portail).

Fichiers :
- `backend/src/api/candidate/controllers/candidate.ts`
- `frontend/src/app/components/public-chat-widget/public-chat-widget.component.ts`

Extrait (backend) :
```ts
const reply = await ollamaChat({ system: CHATBOT_SYSTEM_PROMPT, user: '', messages: sanitized });
ctx.body = { reply: reply.trim() };
```

### Etape 6 — API publique job-postings (liste + detail)
Raison : endpoints simples pour la page publique et les recommandations.

Fichiers :
- `backend/src/api/job-posting/controllers/job-posting.ts`
- `backend/src/api/job-posting/routes/public-job-posting.ts`

Extrait :
```ts
{ method: 'GET', path: '/public/job-postings', handler: 'job-posting.publicList', config: { auth: false } }
{ method: 'GET', path: '/public/job-postings/:id', handler: 'job-posting.publicFindOne', config: { auth: false } }
```

---

## Flux global (resume technique)

1. Offres publiques : `GET /api/job-postings/public` ou `GET /api/public/job-postings`.
2. Candidature : `POST /api/candidates/apply` (CV valide + consentement + pays/ville).
3. Pipeline IA auto : extraction -> parsing -> scoring -> CV standardise.
4. Tracking : `POST /api/candidates/track/request-code` puis `POST /api/candidates/track/verify-code`.
5. Retrait GDPR : `DELETE /api/candidates/withdraw/:token`.
6. RH : listing `/api/candidates/hr`, detail `/api/candidates/hr/:id`, update status `/api/candidates/hr/:id/status`, notes `/api/candidates/hr/:id/notes`.
7. CV IA : preview `/api/candidates/:id/cv-preview`, templates `/api/cv-templates`, download `/api/candidates/:id/cv-pdf`.
8. Config scoring : `/api/hr/job-postings/:id/eval-config`.
9. Recommandations : `/api/public/recommendations`.
10. Chatbot : `/api/public/chat`.

---

## Fichiers principaux par sprint

Sprint 1 :
- `backend/src/api/skill/content-types/skill/schema.json`
- `backend/src/api/skill/controllers/skill.ts`
- `backend/src/api/department/content-types/department/schema.json`
- `backend/src/api/department/controllers/department.ts`
- `backend/src/api/job-posting/content-types/job-posting/schema.json`
- `frontend/src/app/services/auth.service.ts`
- `frontend/src/app/interceptors/token.interceptor.ts`
- `frontend/src/app/guards/auth.guard.ts`
- `frontend/src/app/pages/skills/skills.component.ts`
- `frontend/src/app/pages/departments/departments.component.ts`
- `frontend/src/app/pages/job-postings/job-postings.component.ts`

Sprint 2 :
- `backend/src/api/candidate/controllers/candidate.ts`
- `backend/src/api/candidate/routes/candidate-public.ts`
- `backend/src/api/candidate/content-types/candidate/schema.json`
- `backend/src/api/job-posting/controllers/job-posting.ts`
- `backend/src/api/job-posting/routes/job-posting-status.ts`
- `frontend/src/app/pages/public-jobs/public-job-list.component.ts`
- `frontend/src/app/pages/public-jobs/apply.component.ts`
- `frontend/src/app/pages/public-jobs/track.component.ts`
- `frontend/src/app/pages/public-jobs/withdraw.component.ts`
- `frontend/src/app/pages/candidates/candidates-list.component.ts`
- `frontend/src/app/pages/candidates/candidate-detail.component.ts`
- `frontend/src/app/services/candidate.service.ts`
- `frontend/src/app/services/job-posting.service.ts`

Sprint 3 :
- `backend/src/utils/resume-text.ts`
- `backend/src/utils/ollama.ts`
- `backend/src/utils/json.ts`
- `backend/src/utils/candidate-ai.ts`
- `backend/src/utils/cv-templates.ts`
- `backend/src/utils/html-pdf.ts`
- `backend/src/api/candidate/controllers/candidate.ts`
- `backend/src/api/candidate/routes/candidate-public.ts`
- `frontend/src/app/pages/candidates/candidate-detail.component.ts`
- `frontend/src/app/pages/cv-templates/cv-templates.component.ts`
- `frontend/src/app/services/candidate.service.ts`

Sprint 4 :
- `backend/src/api/job-posting/controllers/job-posting.ts`
- `backend/src/api/job-posting/routes/hr-job-posting.ts`
- `backend/src/api/job-posting/routes/public-job-posting.ts`
- `backend/src/api/candidate/controllers/candidate.ts`
- `backend/src/api/meta/controllers/meta.ts`
- `frontend/src/app/pages/ai-evaluation/ai-evaluation.component.ts`
- `frontend/src/app/pages/analytics/analytics.component.ts`
- `frontend/src/app/pages/public-jobs/recommendation.component.ts`
- `frontend/src/app/components/public-chat-widget/public-chat-widget.component.ts`
- `frontend/src/app/services/job-posting.service.ts`
- `frontend/src/app/services/candidate.service.ts`
