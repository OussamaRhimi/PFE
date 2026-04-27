# Sprint 3 - Pipeline IA + CV standardise

> **CRITICAL**: Follow this document exactly to ensure 100% consistency with the class diagram and sprint backlog. Do not deviate from specified structures, naming conventions, or implementation details.

---

## Table of Contents
1. [Overview](#overview)
2. [Class Diagram Requirements](#class-diagram-requirements)
3. [User Stories & Implementation Tasks](#user-stories--implementation-tasks)
4. [File Structure](#file-structure)
5. [Enum Definitions](#enum-definitions)
6. [API Endpoints](#api-endpoints)
7. [Testing Checklist](#testing-checklist)

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

### Entity: Candidate (UPDATE)
Add these fields to existing Candidate:
```typescript
{
  id: number;
  // ... existing fields ...
  score: number;  // decimal 0-100
  extractedData: JSON;  // parsed CV data
  standardizedCvMarkdown: Text;  // generated markdown
  cvTemplateKey: CvTemplateKey;  // template selection
}
```

### Value Object: EvaluationConfig (NEW)
```typescript
type EvaluationConfig = {
  fitWeight: number;
  completenessWeight: number;
  requiredSkillsWeight: number;
  niceToHaveSkillsWeight: number;
  experienceWeight: number;
  completenessPoints: JSON;
  qualityThresholds: JSON;
};
```

### Catalog: CVTemplate (STATIC)
```typescript
type CvTemplateMeta = {
  key: CvTemplateKey;
  name: string;
  description: string;
};
```

### Service: AIProcessor (NEW)
```typescript
class AIProcessor {
  +processCandidate(candidateId: Integer): void
  +extractTextFromResume(resume: Media): String
  +deterministicEvaluate(requirements: Object, data: Object, meta: Object): EvaluationResult
  +generateCVMarkdown(data: Object): String
  +renderCVTemplate(templateKey: CvTemplateKey, contact: Object, content: Object): String
  +exportCVtoPDF(html: String): Buffer
}
```

---

## Enum Definitions

### CvTemplateKey
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

### S3-US1 (BE) - Update Candidate Schema [Priority: HIGH, 3 days]
**Description**: Add AI pipeline fields to Candidate

**Files to Update**:
- `backend/src/api/candidate/content-types/candidate/schema.json`

**Add to attributes**:
```json
{
  "score": {
    "type": "decimal",
    "min": 0,
    "max": 100
  },
  "extractedData": {
    "type": "json"
  },
  "standardizedCvMarkdown": {
    "type": "text"
  },
  "cvTemplateKey": {
    "type": "enumeration",
    "enum": [
      "standard",
      "experience_first",
      "skills_first",
      "compact",
      "education_first",
      "project_focus",
      "sidebar_photo",
      "accent_pink",
      "teal_circle",
      "navy_gold",
      "sunset"
    ],
    "default": "standard"
  }
}
```

---

### S3-US2 (BE) - Resume Text Extraction [Priority: HIGH, 8 days]
**Description**: Extract text from PDF, DOCX, TXT

**Files to Create**:
- `backend/src/utils/resume-text.ts`

**Implementation**:
```typescript
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export async function extractTextFromResume(file: any): Promise<string> {
  const buffer = file.buffer || await readFile(file.path);
  const mime = file.mimetype?.toLowerCase() || '';
  const ext = file.originalname?.split('.').pop()?.toLowerCase() || '';

  try {
    // PDF extraction
    if (mime.includes('pdf') || ext === 'pdf') {
      const pdfData = await pdfParse(buffer);
      return normalizeCvText(pdfData.text);
    }

    // DOCX extraction
    if (
      mime.includes('officedocument') ||
      mime.includes('wordprocessingml') ||
      ext === 'docx'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return normalizeCvText(result.value);
    }

    // TXT extraction
    if (mime.startsWith('text/') || ext === 'txt') {
      return normalizeCvText(buffer.toString('utf8'));
    }

    throw new Error(`Unsupported resume type: ${mime}`);
  } catch (err) {
    throw new Error(`Text extraction failed: ${err.message}`);
  }
}

function normalizeCvText(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}
```

**Dependencies to Install**:
```json
{
  "mammoth": "^1.6.0",
  "pdf-parse": "^1.1.1"
}
```

---

### S3-US3 (BE) - Ollama Integration [Priority: HIGH, 6 days]
**Description**: Chat with Ollama for CV parsing

**Files to Create**:
- `backend/src/utils/ollama.ts`

**Implementation**:
```typescript
export interface OllamaChatOptions {
  model?: string;
  format?: 'json' | undefined;
  timeout?: number;
}

export async function ollamaChat(
  systemPrompt: string,
  userContent: string,
  options: OllamaChatOptions = {}
): Promise<string> {
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';
  const TIMEOUT_MS = options.timeout || 120000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        stream: false,
        ...(options.format && { format: options.format })
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**System Prompt for Parser**:
```typescript
export const PARSER_SYSTEM_PROMPT = `You are a resume/CV parser. Extract all relevant information and return ONLY valid JSON (no markdown, no code fences).

CRITICAL RULES:
- For dates: use format "Month YYYY" (e.g. "June 2025")
- For current/ongoing roles: set endDate to "Present"
- skills: ONLY short tech names (React, Node.js, Docker)
- competencies: accomplishments or capabilities
- education: degrees, diplomas, programs
- certifications: professional certs, bootcamps, online courses
- projects: personal or academic projects

Return this JSON schema:
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
  "experience": [{ company, title, startDate, endDate, highlights }],
  "education": [{ school, degree, startDate, endDate }],
  "certifications": string[],
  "projects": [{ name, description, links }]
}`;
```

---

### S3-US4 (BE) - JSON Robustness [Priority: HIGH, 5 days]
**Description**: Parse imperfect JSON from LLM

**Files to Create**:
- `backend/src/utils/json.ts`

**Implementation**:
```typescript
export function parseJsonWithRecovery<T = unknown>(text: string): {
  ok: boolean;
  value?: T;
  recovered: boolean;
  error?: Error;
} {
  const raw = text.trim();

  const candidates = [
    raw,
    stripMarkdownCodeFence(raw),
    extractLikelyJsonObject(raw) || '',
    repairCommonIssues(raw)
  ];

  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate) as T;
      return {
        ok: true,
        value,
        recovered: candidate !== raw
      };
    } catch {}
  }

  return {
    ok: false,
    recovered: false,
    error: new Error('Failed to parse JSON after recovery attempts')
  };
}

function stripMarkdownCodeFence(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function extractLikelyJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function repairCommonIssues(text: string): string {
  return text
    .replace(/,\s*([}\]])/g, '$1') // trailing commas
    .replace(/:\s*undefined/g, ': null') // undefined → null
    .replace(/'/g, '"'); // single quotes → double
}
```

---

### S3-US5 (BE) - Pipeline Orchestration [Priority: HIGH, 10 days]
**Description**: Main processCandidate function (extract → parse → evaluate → generate)

**Files to Create**:
- `backend/src/utils/candidate-ai.ts`

**Implementation (excerpt)**:
```typescript
export async function processCandidate(candidateId: number): Promise<void> {
  try {
    // 1. Load candidate
    const candidate = await strapi.documents('api::candidate.candidate').findOne({
      documentId: candidateId,
      populate: ['job_posting', 'resume']
    });

    if (!candidate) throw new Error('Candidate not found');

    // Mark processing
    await updateCandidateStatus(candidateId, 'processing');

    // 2. Extract text
    const cvTextRaw = await extractTextFromResume((candidate as any).resume);
    const cvText = normalizeCvText(cvTextRaw);

    // 3. Parse via Ollama
    const parserRaw = await ollamaChat(PARSER_SYSTEM_PROMPT, cvText, { format: 'json' });
    const parsed = parseJsonWithRecovery(parserRaw).value || {};

    // 4. Evaluate
    const requirements = candidate.job_posting?.requirements || {};
    const evaluation = deterministicEvaluate(requirements, parsed, {
      selfReportedYearsExperience: candidate.selfReportedYearsExperience
    });

    // 5. Generate markdown
    const markdown = renderCvMarkdown(candidate.cvTemplateKey, parsed, evaluation);

    // 6. Save
    await strapi.documents('api::candidate.candidate').update({
      documentId: candidateId,
      data: {
        status: 'processed',
        extractedData: parsed,
        standardizedCvMarkdown: markdown,
        score: evaluation.score
      }
    });
  } catch (err) {
    await updateCandidateStatus(candidateId, 'error');
    throw err;
  }
}
```

---

### S3-US6 (BE) - Deterministic Scoring [Priority: HIGH, 8 days]
**Description**: Skills matching, experience, completeness scoring

**Files to Add to candidate-ai.ts**:
```typescript
export interface EvaluationResult {
  score: number;
  breakdown: {
    fitScore: number;
    completenessScore: number;
    skillsMatched: string[];
    skillsMissing: string[];
    experienceYears: number;
    qualityLabel: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

export function deterministicEvaluate(
  requirements: any,
  extractedData: any,
  meta: any
): EvaluationResult {
  const fitWeight = 0.75;
  const completenessWeight = 0.25;

  // Calculate skill match
  const requiredSkills = requirements.skillsRequired || [];
  const niceSkills = requirements.skillsNiceToHave || [];
  const candidateSkills = extractedData.skills || [];

  const skillsMatched = requiredSkills.filter(s =>
    candidateSkills.some(cs => cs.toLowerCase().includes(s.toLowerCase()))
  );
  const skillsMissing = requiredSkills.filter(
    s => !skillsMatched.includes(s)
  );

  const requiredCoverage = requiredSkills.length > 0
    ? (skillsMatched.length / requiredSkills.length) * 100
    : 100;

  // Calculate experience match
  const candidateYears = meta.selfReportedYearsExperience || 0;
  const requiredYears = requirements.minYearsExperience || 0;
  const experienceMatch = candidateYears >= requiredYears ? 1 : candidateYears / (requiredYears || 1);

  // Calculate completeness
  const sections = ['summary', 'skills', 'experience', 'education'];
  const completeness = sections.filter(s => extractedData[s] && extractedData[s].length > 0).length / sections.length;

  const fitScore = requiredCoverage * 0.6 + experienceMatch * 100 * 0.4;
  const completenessScore = completeness * 100;
  const totalScore = fitScore * fitWeight + completenessScore * completenessWeight;

  const qualityLabel = totalScore >= 80 ? 'excellent' : totalScore >= 60 ? 'good' : totalScore >= 40 ? 'fair' : 'poor';

  return {
    score: Math.round(totalScore),
    breakdown: {
      fitScore: Math.round(fitScore),
      completenessScore: Math.round(completenessScore),
      skillsMatched,
      skillsMissing,
      experienceYears: candidateYears,
      qualityLabel
    }
  };
}
```

---

### S3-US7 (BE) - CV Templates Catalog [Priority: HIGH, 8 days]
**Description**: 11 template styles with rendering

**Files to Create**:
- `backend/src/utils/cv-templates.ts`

**Implementation (excerpt)**:
```typescript
export type CvTemplateKey =
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

export const CV_TEMPLATES: Array<{
  key: CvTemplateKey;
  name: string;
  description: string;
}> = [
  { key: 'standard', name: 'Standard (Blue)', description: 'Clean single-column...' },
  { key: 'experience_first', name: 'Modern (Accent)', description: 'Gradient header...' },
  // ... 9 more templates
];

export function renderCvMarkdownFromTemplate(
  templateKey: CvTemplateKey,
  contact: any,
  content: any
): string {
  switch (templateKey) {
    case 'standard':
      return renderStandardTemplate(contact, content);
    case 'experience_first':
      return renderExperienceFirstTemplate(contact, content);
    // ... more cases
    default:
      return renderStandardTemplate(contact, content);
  }
}

function renderStandardTemplate(contact: any, content: any): string {
  return `# ${contact.fullName}

${contact.email} | ${contact.phone || ''}

## Summary
${content.summary || 'No summary provided'}

## Experience
${(content.experience || [])
  .map(exp => `### ${exp.title} at ${exp.company}
${exp.startDate} - ${exp.endDate}
${(exp.highlights || []).map(h => `- ${h}`).join('\n')}`)
  .join('\n\n')}

## Skills
${(content.skills || []).join(', ')}
`;
}
```

---

### S3-US8 (BE) - HTML-to-PDF Export [Priority: HIGH, 6 days]
**Description**: Convert markdown CV to PDF

**Files to Create**:
- `backend/src/utils/html-pdf.ts`

**Implementation**:
```typescript
import puppeteer from 'puppeteer';
import markdownIt from 'markdown-it';

const md = new markdownIt();

export async function convertMarkdownToPdf(
  markdownContent: string,
  templateKey: string
): Promise<Buffer> {
  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();

    const html = md.render(markdownContent);
    const styledHtml = applyTemplateStyles(html, templateKey);

    await page.setContent(styledHtml, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      printBackground: true
    });

    return Buffer.from(pdf);
  } finally {
    if (browser) await browser.close();
  }
}

function applyTemplateStyles(html: string, templateKey: string): string {
  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; }
      h1 { font-size: 24px; margin-bottom: 5px; }
      h2 { font-size: 16px; margin-top: 15px; color: #0277BD; }
      h3 { font-size: 14px; margin: 10px 0 5px 0; }
    </style>
  `;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${baseStyles}
</head>
<body>
  ${html}
</body>
</html>`;
}
```

**Dependencies**:
```json
{
  "puppeteer": "^21.0.0",
  "markdown-it": "^13.0.0"
}
```

---

### S3-US9 (BE) - CV Preview & Download Endpoints [Priority: HIGH, 5 days]
**Description**: Preview HTML, download PDF, list templates

**Files to Update**:
- `backend/src/api/candidate/controllers/candidate.ts`
- `backend/src/api/candidate/routes/candidate-hr.ts`

**Endpoints**:
```typescript
// controllers
async getCvPreview(ctx) {
  const { id } = ctx.params;
  const { templateKey = 'standard' } = ctx.query;

  const candidate = await strapi.documents('api::candidate.candidate').findOne({
    documentId: id
  });

  if (!candidate || !candidate.standardizedCvMarkdown) {
    return ctx.notFound('CV not available.');
  }

  const html = markdownToHtml(candidate.standardizedCvMarkdown);
  return ctx.ok({ html });
}

async getCvPdf(ctx) {
  const { id } = ctx.params;

  const candidate = await strapi.documents('api::candidate.candidate').findOne({
    documentId: id
  });

  if (!candidate || !candidate.standardizedCvMarkdown) {
    return ctx.notFound('CV not available.');
  }

  const pdf = await convertMarkdownToPdf(
    candidate.standardizedCvMarkdown,
    candidate.cvTemplateKey
  );

  ctx.set('Content-Type', 'application/pdf');
  ctx.set('Content-Disposition', `attachment; filename="cv-${id}.pdf"`);
  ctx.body = pdf;
}

async listCvTemplates(ctx) {
  return ctx.ok({ templates: CV_TEMPLATES });
}
```

**Routes**:
```typescript
export default {
  routes: [
    {
      method: 'GET',
      path: '/cv-templates',
      handler: 'candidate.listCvTemplates',
      config: { auth: false }
    },
    {
      method: 'GET',
      path: '/candidates/:id/cv-preview',
      handler: 'candidate.getCvPreview',
      config: { auth: true }
    },
    {
      method: 'GET',
      path: '/candidates/:id/cv-pdf',
      handler: 'candidate.getCvPdf',
      config: { auth: true }
    }
  ]
};
```

---

### S3-US10 (FE) - CV Preview Component [Priority: MEDIUM, 4 days]
**Description**: Display CV preview with template selector

**Files to Create**:
- `frontend/src/app/pages/candidates/cv-preview.component.ts`

---

## File Structure

### Backend
```
backend/src/
├── api/
│   └── candidate/
│       ├── routes/
│       │   └── candidate-hr.ts
│       └── controllers/
│           └── candidate.ts
└── utils/
    ├── resume-text.ts
    ├── ollama.ts
    ├── json.ts
    ├── candidate-ai.ts
    ├── cv-templates.ts
    └── html-pdf.ts
```

### Frontend
```
frontend/src/app/
└── pages/
    └── candidates/
        └── cv-preview.component.ts
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cv-templates` | ❌ | List all templates |
| GET | `/api/candidates/:id/cv-preview` | ✅ | Preview CV as HTML |
| GET | `/api/candidates/:id/cv-pdf` | ✅ | Download CV as PDF |
| POST | `/api/candidates/:id/process` | ✅ | Trigger processing |
| PUT | `/api/candidates/:id/reprocess` | ✅ | Reprocess candidate |
| PUT | `/api/candidates/:id/template/:key` | ✅ | Change template |

---

## Testing Checklist

### Backend
- [ ] Text extraction works for PDF, DOCX, TXT
- [ ] Ollama integration functional
- [ ] JSON parsing handles malformed responses
- [ ] Pipeline processes candidate end-to-end
- [ ] Score calculated correctly
- [ ] All 11 templates render
- [ ] PDF export functional
- [ ] CV preview endpoint returns HTML
- [ ] Template listing endpoint works
- [ ] Reprocess updates candidate

### Frontend
- [ ] CV preview displays HTML correctly
- [ ] Template selector functional
- [ ] PDF download button works
- [ ] Score displayed with quality label
- [ ] Extracted data visualization

---

## Notes
- Ollama server must be running (e.g., `ollama serve`)
- Puppeteer requires headless browser
- Processing may take 30-120 seconds per candidate
- All markdown rendering uses markdown-it library
