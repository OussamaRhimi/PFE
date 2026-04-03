# Sprint 3 - AI Pipeline Implementation Guide

> **CRITICAL**: Follow this document exactly to achieve 100% similarity with the class diagram and sprint backlog. Do not deviate from the specified structure, naming conventions, or implementation details.

---

## Table of Contents
1. [Overview](#overview)
2. [Class Diagram Requirements](#class-diagram-requirements)
3. [User Stories & Implementation Tasks](#user-stories--implementation-tasks)
4. [File Structure](#file-structure)
5. [Detailed Implementation Specifications](#detailed-implementation-specifications)
6. [Enum Definitions](#enum-definitions)
7. [API Endpoints](#api-endpoints)
8. [Frontend Components](#frontend-components)
9. [Testing Checklist](#testing-checklist)

---

## Overview

**Sprint Duration**: 26 days / member  
**Total Story Points**: 78  
**Focus**: AI Pipeline (parsing, scoring, standardized CV), CV templates/PDF, reprocess functionality

### Core Components to Implement:
- Pipeline orchestration service (extract → parse → evaluate → generate)
- Resume text extraction (PDF, DOCX, TXT)
- Ollama-based CV parsing to structured JSON
- Deterministic fit evaluation & scoring
- Standardized CV generation via templates
- HTML-to-PDF conversion
- Reprocess functionality

---

## Class Diagram Requirements

### Entity: Candidate (Update existing)
```typescript
// Add/ensure these fields exist on Candidate entity
{
  id: number;
  fullName: string;
  email: string;
  linkedin?: string;
  portfolio?: string;
  resume: Media;                    // relation to uploaded file
  status: ApplicationStatus;        // ENUM - see below
  score: number;                    // decimal 0-100
  publicToken: string;
  consent: boolean;
  consentAt?: Date;
  retentionUntil?: Date;
  hrNotes?: string;
  candidateNotes?: string;
  selfReportedYearsExperience?: number;
  extractedData: JSON;              // parsed CV data from Ollama
  standardizedCvMarkdown: string;   // generated markdown CV
  cvTemplateKey: CvTemplateKey;     // selected template
  jobPosting: Relation<JobPosting>; // manyToOne
}
```

### Entity: JobPosting (Ensure exists)
```typescript
{
  id: number;
  title: string;
  description: string;
  requirements: Requirements;  // embedded JSON value object
  status: JobPostingStatus;    // ENUM
}
```

### Value Object: Requirements (Embedded JSON in JobPosting)
```typescript
type Requirements = {
  skillsRequired: string[];
  skillsNiceToHave: string[];
  departments: string[];
  minYearsExperience: number;
  notes: string;
  evaluationConfig?: EvaluationConfig;  // optional, Sprint 4 focus
};
```

### Catalog: CVTemplate (Static catalog, not a DB entity)
```typescript
type CvTemplateMeta = {
  key: CvTemplateKey;
  name: string;
  description: string;
};
```

### Service: AIProcessor
```typescript
class AIProcessor {
  processCandidate(candidateId: number): Promise<void>;
  extractTextFromResume(resume: Media): Promise<string>;
  deterministicEvaluate(requirements: Requirements, extractedData: ExtractedData, meta: CandidateMeta): EvaluationResult;
}
```

---

## Enum Definitions

### ApplicationStatus (CRITICAL - Must match exactly)
```typescript
enum ApplicationStatus {
  new = 'new',
  processing = 'processing',
  processed = 'processed',
  reviewing = 'reviewing',
  shortlisted = 'shortlisted',
  rejected = 'rejected',
  hired = 'hired',
  error = 'error'
}
```

### JobPostingStatus
```typescript
enum JobPostingStatus {
  draft = 'draft',
  open = 'open',
  closed = 'closed'
}
```

### CvTemplateKey (11 templates - Must match exactly)
```typescript
type CvTemplateKey =
  | 'standard'
  | 'experience_first'
  | 'skills_first'
  | 'compact'
  | 'education_first'
  | 'project_focus'
  | 'sidebar_photo'
  | 'accent_pink'
  | 'teal_circle'
  | 'navy_gold'
  | 'sunset';
```

---

## User Stories & Implementation Tasks

### S3-US1 (BE) - Pipeline Orchestration [Priority: HIGH, 8 days]
**Description**: Chain extract → parse → evaluate → generate

#### Implementation:
Create `src/utils/candidate-ai.ts` with main pipeline function:

```typescript
export async function processCandidate(candidateId: number): Promise<void> {
  // 1. Fetch candidate with resume and jobPosting relations
  // 2. Set status to 'processing'
  // 3. Try pipeline:
  //    a. Extract text from resume
  //    b. Parse via Ollama to structured JSON
  //    c. Deterministic evaluation (score calculation)
  //    d. Generate standardized CV markdown
  //    e. Save extractedData, score, standardizedCvMarkdown
  //    f. Set status to 'processed'
  // 4. On error: set status to 'error', log details
}
```

#### Pipeline Flow:
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   Extract   │ -> │    Parse     │ -> │  Evaluate   │ -> │   Generate   │
│    Text     │    │  (Ollama)    │    │  (Score)    │    │  CV Markdown │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
```

---

### S3-US1 (FE) - Processing Status Indicator [Priority: HIGH, 4 days]
**Description**: Processing status indicator and error display in candidate view

#### Implementation:
- Status badge component showing current `ApplicationStatus`
- Color coding:
  - `new`: blue/neutral
  - `processing`: amber/yellow with spinner
  - `processed`: green
  - `reviewing`: purple
  - `shortlisted`: green/success
  - `rejected`: red
  - `hired`: gold
  - `error`: red with error icon
- Error display when status is 'error' (show error message if available)

---

### S3-US2 (BE) - Resume Text Extraction [Priority: HIGH, 8 days]
**Description**: Extract text from PDF (pdf-parse), DOCX (mammoth), and TXT

#### Implementation:
Create `src/utils/resume-text.ts`:

```typescript
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';  // or similar library

export async function extractTextFromResume(file: UploadFileLike): Promise<string> {
  const buffer = await readFileBuffer(file);
  const mime = file.mime?.toLowerCase() || '';
  const ext = getFileExtension(file);

  // PDF extraction
  if (mime.includes('pdf') || ext === '.pdf') {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    return parsed.text;
  }

  // DOCX extraction
  if (mime.includes('officedocument') || mime.includes('wordprocessingml') || ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // TXT extraction
  if (mime.startsWith('text/') || ext === '.txt') {
    return buffer.toString('utf8');
  }

  throw new Error(`Unsupported resume file type: ${mime}`);
}
```

#### Dependencies:
```json
{
  "mammoth": "^1.6.0",
  "pdf-parse": "^1.1.1"
}
```

---

### S3-US3 (BE) - Parse CV via Ollama [Priority: HIGH, 10 days]
**Description**: Parse CV into structured JSON (contact, skills, experience, education, projects)

#### Implementation:
Create `src/utils/ollama.ts`:

```typescript
export async function ollamaChat(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,  // e.g., 'llama3.2' or 'mistral'
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: false
    })
  });
  const data = await response.json();
  return data.message?.content || '';
}
```

#### Parser System Prompt:
```typescript
const PARSER_SYSTEM_PROMPT = `Extract contact info, skills, and work history from this CV into a clean JSON structure.
Return ONLY valid JSON (no markdown, no code fences).

IMPORTANT: For all dates (startDate, endDate), use the format "Month YYYY" (e.g. "June 2025").
If only a year is given, use "YYYY". If the role is current/ongoing, set endDate to "Present".

CRITICAL CLASSIFICATION RULES:
- "skills" is ONLY for short technology/tool names (e.g. "React", "Node.js", "Docker").
- "competencies" is for accomplishment descriptions or capability statements.
- "education" is for degrees, diplomas, academic programs.
- "certifications" is for professional certifications, online courses, bootcamps.
- "projects" is for personal/academic projects.

Output JSON schema:
{
  "contact": {
    "fullName": string,
    "email": string,
    "phone": string | null,
    "location": string | null,
    "linkedin": string | null,
    "portfolio": string | null,
    "links": string[]
  },
  "summary": string | null,
  "skills": string[],
  "competencies": string[],
  "languages": string[],
  "qualities": string[],
  "interests": string[],
  "experience": [{
    "company": string,
    "title": string,
    "startDate": string,
    "endDate": string,
    "highlights": string[]
  }],
  "education": [{
    "school": string,
    "degree": string,
    "startDate": string,
    "endDate": string
  }],
  "certifications": string[],
  "projects": [{
    "name": string,
    "description": string,
    "links": string[]
  }]
}`;
```

#### ExtractedData Type:
```typescript
type ExtractedData = {
  contact: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    portfolio?: string;
    links?: string[];
  };
  summary?: string;
  skills: string[];
  competencies: string[];
  languages: string[];
  qualities: string[];
  interests: string[];
  experience: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate: string;
    highlights: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    startDate: string;
    endDate: string;
  }>;
  certifications: string[];
  projects: Array<{
    name: string;
    description: string;
    links: string[];
  }>;
};
```

---

### S3-US4 (BE) - Deterministic Fit Evaluation [Priority: HIGH, 10 days]
**Description**: Skills coverage, experience match, completeness scoring

#### Implementation:
Add to `src/utils/candidate-ai.ts`:

```typescript
export type EvaluationResult = {
  score: number;  // 0-100
  breakdown: {
    fitScore: number;
    completenessScore: number;
    skillsMatched: string[];
    skillsMissing: string[];
    niceToHaveMatched: string[];
    experienceYears: number;
    experienceMatch: boolean;
  };
  qualityLabel: 'excellent' | 'good' | 'fair' | 'poor';
};

export function deterministicEvaluate(
  requirements: Requirements,
  extractedData: ExtractedData,
  meta: { selfReportedYearsExperience?: number }
): EvaluationResult {
  // Weights (default config)
  const fitWeight = 75;
  const completenessWeight = 25;

  // 1. Calculate Fit Score (skills matching + experience)
  const candidateSkills = normalizeSkills(extractedData.skills);
  const requiredSkills = normalizeSkills(requirements.skillsRequired);
  const niceToHaveSkills = normalizeSkills(requirements.skillsNiceToHave);

  const skillsMatched = requiredSkills.filter(s => candidateSkills.includes(s));
  const skillsMissing = requiredSkills.filter(s => !candidateSkills.includes(s));
  const niceToHaveMatched = niceToHaveSkills.filter(s => candidateSkills.includes(s));

  const requiredCoverage = requiredSkills.length > 0
    ? (skillsMatched.length / requiredSkills.length) * 100
    : 100;

  const niceToHaveCoverage = niceToHaveSkills.length > 0
    ? (niceToHaveMatched.length / niceToHaveSkills.length) * 100
    : 0;

  // Experience calculation from parsed data
  const experienceYears = calculateTotalExperience(extractedData.experience);
  const experienceMatch = experienceYears >= (requirements.minYearsExperience || 0);
  const experienceScore = experienceMatch ? 100 : (experienceYears / requirements.minYearsExperience) * 100;

  const fitScore = (requiredCoverage * 0.75) + (niceToHaveCoverage * 0.15) + (experienceScore * 0.10);

  // 2. Calculate Completeness Score
  const completenessScore = calculateCompletenessScore(extractedData);

  // 3. Final weighted score
  const score = (fitScore * fitWeight / 100) + (completenessScore * completenessWeight / 100);

  // 4. Quality label
  const qualityLabel = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';

  return {
    score: Math.round(score * 100) / 100,
    breakdown: {
      fitScore,
      completenessScore,
      skillsMatched,
      skillsMissing,
      niceToHaveMatched,
      experienceYears,
      experienceMatch
    },
    qualityLabel
  };
}

function calculateCompletenessScore(data: ExtractedData): number {
  let points = 0;
  const maxPoints = 100;

  // Contact info (35 points)
  if (data.contact?.fullName) points += 10;
  if (data.contact?.email) points += 15;
  if (data.contact?.phone) points += 5;
  if (data.contact?.location) points += 5;

  // Links (10 points)
  if (data.contact?.linkedin) points += 5;
  if (data.contact?.portfolio) points += 5;

  // Content (55 points)
  if (data.summary) points += 10;
  if (data.skills?.length > 0) points += 5;
  if (data.experience?.length > 0) points += 15;
  if (data.experience?.some(e => e.startDate && e.endDate)) points += 10;
  if (data.education?.length > 0) points += 10;
  if (data.projects?.length > 0) points += 5;

  return Math.min(points, maxPoints);
}
```

---

### S3-US5 (BE) - Generate Standardized CV Markdown [Priority: HIGH, 8 days]
**Description**: Generate CV markdown via Ollama with template context

#### Implementation:
Create `src/utils/cv-templates.ts`:

```typescript
// Template catalog (11 templates)
export const CV_TEMPLATES: CvTemplateMeta[] = [
  { key: 'standard', name: 'Standard (Blue)', description: 'Clean single-column with blue accents.' },
  { key: 'experience_first', name: 'Modern (Accent Header)', description: 'Gradient header band + crisp sections.' },
  { key: 'skills_first', name: 'Two Column', description: 'Two-column layout with skill meters in sidebar.' },
  { key: 'compact', name: 'Compact', description: 'Denser spacing for longer resumes.' },
  { key: 'education_first', name: 'Minimal', description: 'Minimal, monochrome, very ATS-friendly.' },
  { key: 'project_focus', name: 'Project Focus', description: 'Projects highlighted early.' },
  { key: 'sidebar_photo', name: 'Sidebar + Photo', description: 'Dark sidebar with photo.' },
  { key: 'accent_pink', name: 'Pink Accent', description: 'Pink accent with right contact card.' },
  { key: 'teal_circle', name: 'Teal Circle', description: 'Circular photo header + teal dividers.' },
  { key: 'navy_gold', name: 'Navy Gold', description: 'Navy sidebar with gold accents.' },
  { key: 'sunset', name: 'Sunset', description: 'Warm gradient header with orange tones.' }
];

export function renderCvMarkdownFromTemplate(
  templateKey: CvTemplateKey,
  contact: ResumeContact,
  content: ResumeContent
): string {
  // Each template returns styled markdown/HTML hybrid
  // that can be converted to PDF
  switch (templateKey) {
    case 'standard': return renderStandardTemplate(contact, content);
    case 'experience_first': return renderExperienceFirstTemplate(contact, content);
    // ... implement each template
    default: return renderStandardTemplate(contact, content);
  }
}
```

#### Generation Flow in Pipeline:
```typescript
// In processCandidate after evaluation:
const templateKey = candidate.cvTemplateKey || 'standard';
const standardizedCvMarkdown = renderCvMarkdownFromTemplate(
  templateKey,
  extractedData.contact,
  extractedData  // contains skills, experience, education, etc.
);
```

---

### S3-US5 (FE) - Standardized CV Preview Display [Priority: HIGH, 4 days]
**Description**: CV preview display in candidate detail

#### Implementation:
- Create `StandardizedCvPreviewComponent`
- Render the `standardizedCvMarkdown` field as HTML
- Style container to look like a document preview
- Add zoom controls if needed
- Support dark/light mode

---

### S3-US6 (BE) - CV Template Catalog Route [Priority: MEDIUM, 4 days]
**Description**: CV template catalog data and selection route

#### API Endpoints:
```typescript
// GET /api/cv-templates
// Returns list of available templates
router.get('/cv-templates', (ctx) => {
  ctx.body = CV_TEMPLATES;
});

// PUT /api/candidates/:id/template
// Update candidate's selected template
router.put('/candidates/:id/template', async (ctx) => {
  const { templateKey } = ctx.request.body;
  if (!isCvTemplateKey(templateKey)) {
    ctx.throw(400, 'Invalid template key');
  }
  await strapi.entityService.update('api::candidate.candidate', ctx.params.id, {
    data: { cvTemplateKey: templateKey }
  });
  ctx.body = { success: true };
});
```

---

### S3-US6 (FE) - Template Picker UI [Priority: MEDIUM, 6 days]
**Description**: Gallery with preview thumbnails

#### Implementation:
- Grid layout showing all 11 templates
- Each card shows:
  - Thumbnail preview image
  - Template name
  - Short description
- Selected template highlighted
- On select: call PUT endpoint, regenerate CV if already processed

---

### S3-US7 (BE) - HTML-to-PDF Conversion [Priority: MEDIUM, 4 days]
**Description**: Playwright-based HTML-to-PDF conversion endpoint

#### Implementation:
Create `src/utils/html-pdf.ts`:

```typescript
import { chromium } from 'playwright';

export async function convertHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setContent(html, { waitUntil: 'networkidle' });
  
  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    printBackground: true
  });
  
  await browser.close();
  return pdf;
}
```

#### API Endpoint:
```typescript
// GET /api/candidates/:id/cv-pdf
// Converts standardizedCvMarkdown to PDF and returns
router.get('/candidates/:id/cv-pdf', async (ctx) => {
  const candidate = await strapi.entityService.findOne('api::candidate.candidate', ctx.params.id);
  
  if (!candidate?.standardizedCvMarkdown) {
    ctx.throw(400, 'CV not yet generated');
  }
  
  const html = markdownToHtml(candidate.standardizedCvMarkdown);
  const pdf = await convertHtmlToPdf(html);
  
  ctx.set('Content-Type', 'application/pdf');
  ctx.set('Content-Disposition', `attachment; filename="${candidate.fullName}-CV.pdf"`);
  ctx.body = pdf;
});
```

#### Dependencies:
```json
{
  "playwright": "^1.40.0"
}
```

---

### S3-US7 (FE) - Download CV Button [Priority: MEDIUM, 4 days]
**Description**: Download standardized CV button (HR and public token flows)

#### Implementation:
- Add "Download CV" button in candidate detail view
- Two access modes:
  1. **HR Mode**: Authenticated HR user downloads any candidate's CV
  2. **Public Token Mode**: Candidate uses their `publicToken` to download own CV
- Button states:
  - Disabled if CV not generated
  - Loading spinner during download
  - Success feedback after download

---

### S3-US8 (BE) - Reprocess Logic [Priority: MEDIUM, 4 days]
**Description**: Reset status to new and re-trigger pipeline

#### Implementation:
```typescript
// PUT /api/candidates/:id/reprocess
router.put('/candidates/:id/reprocess', async (ctx) => {
  const candidate = await strapi.entityService.findOne('api::candidate.candidate', ctx.params.id);
  
  if (!candidate) ctx.throw(404, 'Candidate not found');
  
  // Reset AI-related fields
  await strapi.entityService.update('api::candidate.candidate', ctx.params.id, {
    data: {
      status: 'new',
      score: null,
      extractedData: null,
      standardizedCvMarkdown: null
    }
  });
  
  // Re-trigger pipeline (async)
  processCandidate(ctx.params.id).catch(err => {
    console.error(`Reprocess failed for candidate ${ctx.params.id}:`, err);
  });
  
  ctx.body = { success: true, message: 'Reprocessing started' };
});
```

---

### S3-US8 (FE) - Reprocess Button [Priority: MEDIUM, 4 days]
**Description**: Reprocess button with confirmation in candidate detail

#### Implementation:
- "Reprocess" button visible when status is 'processed' or 'error'
- Confirmation dialog: "This will re-parse the CV and recalculate the score. Continue?"
- On confirm: call PUT endpoint
- Show loading state until status changes to 'processing'

---

## File Structure

```
backend/
├── src/
│   ├── api/
│   │   └── candidate/
│   │       ├── controllers/
│   │       │   └── candidate.ts      # Add reprocess, cv-pdf endpoints
│   │       ├── routes/
│   │       │   └── candidate.ts      # Register custom routes
│   │       └── services/
│   │           └── candidate.ts      # Business logic
│   └── utils/
│       ├── candidate-ai.ts           # Pipeline orchestration, evaluation
│       ├── resume-text.ts            # PDF/DOCX/TXT extraction
│       ├── ollama.ts                 # Ollama chat integration
│       ├── cv-templates.ts           # Template catalog & rendering
│       ├── html-pdf.ts               # Playwright PDF conversion
│       └── json.ts                   # JSON parsing utilities

frontend/
├── src/
│   └── app/
│       ├── features/
│       │   └── candidates/
│       │       ├── components/
│       │       │   ├── status-badge/
│       │       │   ├── cv-preview/
│       │       │   ├── template-picker/
│       │       │   └── reprocess-button/
│       │       └── pages/
│       │           └── candidate-detail/
│       └── shared/
│           └── services/
│               └── candidate.service.ts
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cv-templates` | List all CV templates |
| PUT | `/api/candidates/:id/template` | Update candidate's template |
| GET | `/api/candidates/:id/cv-pdf` | Download CV as PDF |
| PUT | `/api/candidates/:id/reprocess` | Trigger reprocessing |
| GET | `/api/candidates/:id/cv-pdf?token=xxx` | Public token PDF download |

---

## Testing Checklist

### Backend Tests
- [ ] extractTextFromResume handles PDF correctly
- [ ] extractTextFromResume handles DOCX correctly
- [ ] extractTextFromResume handles TXT correctly
- [ ] extractTextFromResume throws for unsupported types
- [ ] Ollama parser returns valid JSON
- [ ] Ollama parser extracts all required fields
- [ ] deterministicEvaluate calculates correct score
- [ ] Skills matching is case-insensitive
- [ ] Experience years calculation is accurate
- [ ] Completeness score includes all factors
- [ ] CV template rendering works for all 11 templates
- [ ] HTML-to-PDF conversion produces valid PDF
- [ ] Pipeline orchestration handles errors gracefully
- [ ] Reprocess endpoint resets fields correctly

### Frontend Tests
- [ ] Status badge shows correct colors
- [ ] Processing spinner appears during 'processing' status
- [ ] Error state displays error icon/message
- [ ] CV preview renders markdown correctly
- [ ] Template picker shows all 11 templates
- [ ] Template selection updates candidate
- [ ] Download button triggers PDF download
- [ ] Reprocess button shows confirmation
- [ ] Reprocess triggers status change

---

## Environment Variables

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# PDF Generation (optional, for Playwright)
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium
```

---

## Implementation Order (Recommended)

1. **Week 1**: S3-US2 (text extraction) + S3-US3 (Ollama parsing)
2. **Week 2**: S3-US4 (evaluation) + S3-US1-BE (pipeline orchestration)
3. **Week 3**: S3-US5 (CV generation) + S3-US1-FE (status indicator)
4. **Week 4**: S3-US6 (templates) + S3-US7 (PDF) + S3-US8 (reprocess)

---

## Notes for Implementation

1. **Ollama Setup**: Ensure Ollama is running locally with the specified model pulled (`ollama pull llama3.2`)

2. **Playwright**: Requires Chromium. Run `npx playwright install chromium` before first use.

3. **Error Handling**: Always wrap pipeline steps in try-catch. Set status to 'error' on failure.

4. **Status Transitions**:
   - `new` → `processing` (start pipeline)
   - `processing` → `processed` (success) or `error` (failure)
   - `error` → `new` (reprocess)
   - `processed` → `new` (reprocess)

5. **Template Selection**: Default to 'standard' if no template selected.

6. **Public Token Access**: Verify token matches candidate before allowing PDF download.

---

## Prompt for Copilot

When implementing Sprint 3 in your other project, use this prompt:

```
I am implementing Sprint 3 of the IOhire CV management system. Please follow the 
SPRINT3_IMPLEMENTATION_GUIDE.md document EXACTLY. 

Key requirements:
1. Match the class diagram 100% (Candidate, JobPosting, Requirements, CVTemplate, AIProcessor)
2. Implement all 11 CV templates with exact keys
3. Use the exact ApplicationStatus enum values
4. Pipeline flow: extract → parse → evaluate → generate
5. Use Ollama for CV parsing (not OpenAI)
6. Use Playwright for PDF generation (not wkhtmltopdf)

Start with [specify which user story to implement].
```

---

*Document Version: 1.0*  
*Last Updated: Sprint 3 Planning Phase*
