import type { Core } from '@strapi/strapi';
import { parseJsonWithRecovery } from './json';
import { ollamaChat } from './ollama';
import { extractTextFromResume } from './resume-text';
import { isCvTemplateKey, renderCvMarkdownFromTemplate } from './cv-templates';
import type { CvTemplateKey, EvaluationResult, Requirements, ResumeContent, ResumeContact } from './types';

// -----------------------------------------------------------------------------
// Evaluation config
// -----------------------------------------------------------------------------

export type CompletenessPointsConfig = {
  fullName: number;
  email: number;
  phone: number;
  location: number;
  links: number;
  linkedin: number;
  portfolio: number;
  summary: number;
  competencies: number;
  experience: number;
  experienceDates: number;
  education: number;
};

export type CustomCriterion = {
  name: string;
  type: 'bonus' | 'penalty';
  points: number;
  keywords: string[];
  requireAll: boolean;
};

export type QualityThresholds = {
  excellent: number;
  good: number;
  fair: number;
};

export type EvaluationConfig = {
  fitWeight: number;
  completenessWeight: number;
  requiredSkillsWeight: number;
  niceToHaveSkillsWeight: number;
  experienceWeight: number;
  completenessPoints: CompletenessPointsConfig;
  customCriteria: CustomCriterion[];
  qualityThresholds: QualityThresholds;
};

export const DEFAULT_EVALUATION_CONFIG: EvaluationConfig = {
  fitWeight: 75,
  completenessWeight: 25,
  requiredSkillsWeight: 75,
  niceToHaveSkillsWeight: 15,
  experienceWeight: 10,
  completenessPoints: {
    fullName: 10,
    email: 15,
    phone: 5,
    location: 5,
    links: 5,
    linkedin: 5,
    portfolio: 5,
    summary: 10,
    competencies: 5,
    experience: 15,
    experienceDates: 10,
    education: 10,
  },
  customCriteria: [],
  qualityThresholds: { excellent: 80, good: 60, fair: 40 },
};

export function mergeEvaluationConfig(raw: unknown): EvaluationConfig {
  const d = DEFAULT_EVALUATION_CONFIG;
  if (!raw || typeof raw !== 'object') {
    return {
      ...d,
      completenessPoints: { ...d.completenessPoints },
      customCriteria: [],
      qualityThresholds: { ...d.qualityThresholds },
    };
  }
  const r = raw as Record<string, unknown>;

  const fitWeight = clampNum(r.fitWeight, 0, 100, d.fitWeight);
  const completenessWeight = clampNum(r.completenessWeight, 0, 100, d.completenessWeight);
  const requiredSkillsWeight = clampNum(r.requiredSkillsWeight, 0, 100, d.requiredSkillsWeight);
  const niceToHaveSkillsWeight = clampNum(r.niceToHaveSkillsWeight, 0, 100, d.niceToHaveSkillsWeight);
  const experienceWeight = clampNum(r.experienceWeight, 0, 100, d.experienceWeight);

  const cp = r.completenessPoints && typeof r.completenessPoints === 'object'
    ? (r.completenessPoints as Record<string, unknown>)
    : {};
  const completenessPoints: CompletenessPointsConfig = {
    fullName: clampNum(cp.fullName, 0, 100, d.completenessPoints.fullName),
    email: clampNum(cp.email, 0, 100, d.completenessPoints.email),
    phone: clampNum(cp.phone, 0, 100, d.completenessPoints.phone),
    location: clampNum(cp.location, 0, 100, d.completenessPoints.location),
    links: clampNum(cp.links, 0, 100, d.completenessPoints.links),
    linkedin: clampNum(cp.linkedin, 0, 100, d.completenessPoints.linkedin),
    portfolio: clampNum(cp.portfolio, 0, 100, d.completenessPoints.portfolio),
    summary: clampNum(cp.summary, 0, 100, d.completenessPoints.summary),
    competencies: clampNum(cp.competencies, 0, 100, d.completenessPoints.competencies),
    experience: clampNum(cp.experience, 0, 100, d.completenessPoints.experience),
    experienceDates: clampNum(cp.experienceDates, 0, 100, d.completenessPoints.experienceDates),
    education: clampNum(cp.education, 0, 100, d.completenessPoints.education),
  };

  const customCriteria: CustomCriterion[] = [];
  if (Array.isArray(r.customCriteria)) {
    for (const c of r.customCriteria) {
      if (!c || typeof c !== 'object') continue;
      const obj = c as Record<string, unknown>;
      const name = typeof obj.name === 'string' ? obj.name.trim() : '';
      const type = obj.type === 'penalty' ? 'penalty' : 'bonus';
      const points = clampNum(obj.points, 0, 50, 5);
      const keywords = Array.isArray(obj.keywords)
        ? obj.keywords.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim())
        : [];
      const requireAll = !!obj.requireAll;
      if (name && keywords.length > 0) customCriteria.push({ name, type, points, keywords, requireAll });
    }
  }

  const qt = r.qualityThresholds && typeof r.qualityThresholds === 'object'
    ? (r.qualityThresholds as Record<string, unknown>)
    : {};
  const qualityThresholds: QualityThresholds = {
    excellent: clampNum(qt.excellent, 0, 100, d.qualityThresholds.excellent),
    good: clampNum(qt.good, 0, 100, d.qualityThresholds.good),
    fair: clampNum(qt.fair, 0, 100, d.qualityThresholds.fair),
  };

  return {
    fitWeight,
    completenessWeight,
    requiredSkillsWeight,
    niceToHaveSkillsWeight,
    experienceWeight,
    completenessPoints,
    customCriteria,
    qualityThresholds,
  };
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

type CandidateEntity = {
  id: number;
  fullName?: string | null;
  email?: string | null;
  linkedin?: string | null;
  portfolio?: string | null;
  cvTemplateKey?: string | null;
  resume?: { url: string; mime?: string; ext?: string } | Array<{ url: string; mime?: string; ext?: string }>;
  job_posting?: { requirements?: unknown } | null;
};

const PARSER_SYSTEM_PROMPT =
  'Extract contact info, skills, and work history from this CV into a clean JSON structure. ' +
  'Return ONLY valid JSON (no markdown, no code fences). ' +
  'IMPORTANT: For all dates (startDate, endDate), use the format "Month YYYY" (e.g. "June 2025"). ' +
  'If only a year is given, use "YYYY". If the role is current/ongoing, set endDate to "Present". ' +
  'CRITICAL CLASSIFICATION RULES: ' +
  '- "skills" is ONLY for short technology/tool names (e.g. "React", "Node.js", "Docker", "PostgreSQL", "Git"). ' +
  '- "competencies" is for accomplishment descriptions or capability statements (e.g. "Built a complete authentication system", "Implemented 2FA with TOTP"). ' +
  '- Do NOT put full sentences or descriptions in "skills". If it reads like a sentence, it belongs in "competencies". ' +
  '- "education" is for degrees, diplomas, academic programs at universities, institutes, schools, or colleges (e.g. "Software Engineering at ISIMS", "Bachelor at MIT"). ' +
  '- "experience" is ONLY for professional work: jobs, internships at companies, freelance work. ' +
  '- If someone is a STUDENT at a university/institute/school, that belongs in "education", NOT "experience". ' +
  '- Internships at companies (not schools) go in "experience". ' +
  '- Academic projects or student roles at educational institutions go in "education" or "projects", NOT "experience". ' +
  'Use this shape: { contact: { fullName?: string, email?: string, phone?: string, location?: string, links?: string[] }, ' +
  'summary?: string, skills: string[], competencies?: string[], experience: Array<{ company?: string, title?: string, startDate?: string, endDate?: string, highlights?: string[] }>, ' +
  'education?: Array<{ school?: string, degree?: string, startDate?: string, endDate?: string }>, certifications?: string[], projects?: Array<{ name?: string, description?: string, links?: string[] }> }';

const GENERATOR_SYSTEM_PROMPT =
  "Generate polished resume content from the candidate's extracted data. " +
  'Company style guide: concise, ATS-friendly, clear headings, bullet highlights, no tables. ' +
  'Return ONLY valid JSON (no markdown, no code fences) using this shape: ' +
  '{ summary?: string, skills: string[], experience: Array<{ company?: string, title?: string, startDate?: string, endDate?: string, highlights?: string[] }>, ' +
  'education?: Array<{ school?: string, degree?: string, startDate?: string, endDate?: string }>, certifications?: string[], projects?: Array<{ name?: string, description?: string, links?: string[] }>, ' +
  'languages?: string[], qualities?: string[], interests?: string[] }';

const JSON_REPAIR_SYSTEM_PROMPT =
  'You repair malformed JSON. Return ONLY valid JSON and preserve all original data fields/values as much as possible. ' +
  'Do not add markdown, explanations, comments, or code fences.';

const MONTH_MAP: Array<[RegExp, string]> = [
  [/\bjanvier\b/gi, 'January'],
  [/\bjanv\.?\b/gi, 'January'],
  [/\bfevrier\b|\bf\u00e9vrier\b/gi, 'February'],
  [/\bfev\.?\b|\bfevr\.?\b|\bf\u00e9v\.?\b|\bf\u00e9vr\.?\b/gi, 'February'],
  [/\bmars\b/gi, 'March'],
  [/\bavril\b/gi, 'April'],
  [/\bavr\.?\b/gi, 'April'],
  [/\bmai\b/gi, 'May'],
  [/\bjuin\b/gi, 'June'],
  [/\bjuillet\b/gi, 'July'],
  [/\bjuil\.?\b|\bjuill\.?\b/gi, 'July'],
  [/\bao[u\u00fb]t\b/gi, 'August'],
  [/\bseptembre\b/gi, 'September'],
  [/\boctobre\b/gi, 'October'],
  [/\bnovembre\b/gi, 'November'],
  [/\bd[\u00e9e]cembre\b/gi, 'December'],
  [/\bsept\b/gi, 'September'],
];

const SKILL_ALIAS_GROUPS: Record<string, string[]> = {
  react: ['reactjs', 'react js', 'react.js'],
  vue: ['vuejs', 'vue js', 'vue.js'],
  angular: ['angularjs', 'angular js'],
  typescript: ['ts', 'type script'],
  javascript: ['js', 'java script', 'ecmascript', 'es6'],
  nodejs: ['node js', 'node.js', 'node'],
  nextjs: ['next js', 'next.js'],
  nestjs: ['nest js', 'nest.js'],
  springboot: ['spring boot', 'spring-boot'],
  mongodb: ['mongo db', 'mongo-db', 'mango db', 'mangodb'],
  mysql: ['my sql'],
  postgresql: ['postgres', 'postgre sql'],
  expressjs: ['express js', 'express.js'],
  reactnative: ['react native', 'react-native'],
  dotnet: ['.net', 'dot net', 'asp.net', 'aspnet'],
  csharp: ['c#', 'c sharp'],
  tailwindcss: ['tailwind css'],
  graphql: ['graph ql', 'graph-ql'],
};

function truncateForModel(text: string, maxChars: number): string {
  const s = String(text ?? '');
  if (s.length <= maxChars) return s;
  const head = s.slice(0, Math.floor(maxChars * 0.65));
  const tail = s.slice(s.length - Math.floor(maxChars * 0.25));
  return `${head}\n\n[...truncated...]\n\n${tail}`;
}

function normalizeCvText(input: string): string {
  let out = String(input ?? '');
  out = out.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  out = out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  // Split concatenated dates/roles (e.g., "2025Web developer")
  out = out.replace(/(\d{4})(?=[A-Z])/g, '$1\n');
  return out;
}

const SECTION_HEADINGS: Record<string, string[]> = {
  profile: ['profile', 'summary', 'about', 'profil'],
  experience: ['professional experience', 'work experience', 'experience'],
  education: ['education', 'formation'],
  skills: ['skills', 'competences', 'competencies'],
  projects: ['projects', 'project'],
  certificates: ['certificates', 'certifications'],
  languages: ['languages', 'langues'],
};

const KNOWN_LANGUAGES = new Set([
  'arabic', 'english', 'french', 'spanish', 'german', 'italian', 'portuguese', 'dutch',
  'turkish', 'russian', 'chinese', 'japanese', 'korean', 'hindi', 'berber', 'amazigh',
]);

function detectHeading(line: string): string | null {
  const raw = line.trim();
  if (!raw) return null;
  const compact = raw.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [key, candidates] of Object.entries(SECTION_HEADINGS)) {
    for (const candidate of candidates) {
      if (compact === candidate || compact.includes(candidate)) return key;
    }
  }
  if (raw.length <= 28 && raw === raw.toUpperCase()) {
    for (const [key, candidates] of Object.entries(SECTION_HEADINGS)) {
      if (candidates.some(c => raw.toLowerCase().includes(c))) return key;
    }
  }
  return null;
}

function splitSections(lines: string[]): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let current: string | null = null;
  for (const raw of lines) {
    const heading = detectHeading(raw);
    if (heading) {
      current = heading;
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (current) sections[current].push(raw);
  }
  return sections;
}

function extractContactFromText(lines: string[]): ResumeContact {
  const joined = lines.join(' ');
  const emailMatch = joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  const phoneMatches = joined.match(/\+?\d[\d\s().-]{6,}\d/g) || [];
  const phone = phoneMatches
    .map((p) => p.replace(/[^\d+]/g, ''))
    .sort((a, b) => b.length - a.length)[0];

  const linkMatches = joined.match(/(https?:\/\/[^\s]+|www\.[^\s]+|linkedin\.com\/[^\s]+|github\.com\/[^\s]+)/gi) || [];
  const links = uniqStrings(linkMatches.map(l => l.replace(/[),.;]+$/, '')));

  const linkedin = links.find(l => l.toLowerCase().includes('linkedin.com'));
  const portfolio = links.find(l => !l.toLowerCase().includes('linkedin.com') && !l.toLowerCase().includes('github.com'));

  const candidateName = lines.find((line) => {
    if (line.length > 60) return false;
    if (/\d/.test(line)) return false;
    if (/@|http|www\./i.test(line)) return false;
    const parts = line.trim().split(/\s+/);
    return parts.length >= 2 && parts.length <= 4;
  });

  const locationLine = lines.find((line) => {
    if (!line.includes(',')) return false;
    if (/@|http|www\./i.test(line)) return false;
    if (/\d/.test(line)) return false;
    return line.length <= 50;
  });

  return {
    fullName: candidateName ? candidateName.trim() : undefined,
    email: emailMatch ? emailMatch[0].trim() : undefined,
    phone: phone ? phone.trim() : undefined,
    location: locationLine ? locationLine.trim() : undefined,
    linkedin: linkedin ? linkedin.trim() : undefined,
    portfolio: portfolio ? portfolio.trim() : undefined,
    links,
  };
}

function splitSkillTokens(line: string): string[] {
  const noBullet = line.replace(/^[-•\u2022]+/, '').trim();
  if (!noBullet) return [];
  const payload = noBullet.includes(':') ? noBullet.split(':').slice(1).join(':') : noBullet;
  return payload
    .split(/[,|;]|\s[-–—]\s|\u2022|•/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function extractSkillsFromSection(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    out.push(...splitSkillTokens(line));
  }
  return uniqStrings(out);
}

function extractLanguagesFromSection(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const parts = line.split(/[|,;]/).map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      const token = part.split(':')[0]?.trim().toLowerCase();
      if (token && KNOWN_LANGUAGES.has(token)) out.push(token);
    }
  }
  return uniqStrings(out.map((l) => l.charAt(0).toUpperCase() + l.slice(1)));
}

function extractSummaryFromSection(lines: string[]): string | null {
  const summary = lines.join(' ').trim();
  return summary ? summary : null;
}

function formatDateFromDate(input: Date | null): string | null {
  if (!input) return null;
  const year = input.getUTCFullYear();
  const month = input.getUTCMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function extractEducationFromSection(lines: string[]): Array<Record<string, unknown>> {
  const entries: Array<Record<string, unknown>> = [];
  const buffer: string[] = [];
  for (const line of lines) {
    const range = parseDateRange(line);
    if (range) {
      const school = buffer.pop();
      const degree = buffer.pop();
      entries.push({
        ...(degree ? { degree } : {}),
        ...(school ? { school } : {}),
        ...(formatDateFromDate(range.start) ? { startDate: formatDateFromDate(range.start) } : {}),
        ...(formatDateFromDate(range.end) ? { endDate: formatDateFromDate(range.end) } : {}),
      });
      buffer.length = 0;
      continue;
    }
    if (line) buffer.push(line);
  }
  return entries;
}

function extractExperienceFromSection(lines: string[]): Array<Record<string, unknown>> {
  const entries: Array<Record<string, unknown>> = [];
  const buffer: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const range = parseDateRange(line);
    if (range) {
      const title = buffer.pop();
      const company = buffer.pop();
      const highlights: string[] = [];
      let j = i + 1;
      while (j < lines.length && /^[-•\u2022]/.test(lines[j])) {
        highlights.push(lines[j].replace(/^[-•\u2022]+/, '').trim());
        j += 1;
      }
      entries.push({
        ...(title ? { title } : {}),
        ...(company ? { company } : {}),
        ...(formatDateFromDate(range.start) ? { startDate: formatDateFromDate(range.start) } : {}),
        ...(formatDateFromDate(range.end) ? { endDate: formatDateFromDate(range.end) } : {}),
        ...(highlights.length ? { highlights } : {}),
      });
      buffer.length = 0;
      continue;
    }
    if (line) buffer.push(line);
  }

  return entries;
}

function extractProjectsFromSection(lines: string[]): Array<Record<string, unknown>> {
  const entries: Array<Record<string, unknown>> = [];
  for (const line of lines) {
    if (!line) continue;
    const name = line.replace(/^[-•\u2022]+/, '').trim();
    if (name.length < 3) continue;
    entries.push({ name });
  }
  return entries;
}

function parseResumeHeuristic(text: string): Record<string, unknown> {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const sections = splitSections(lines);
  const contact = extractContactFromText(lines);
  const summary = sections.profile ? extractSummaryFromSection(sections.profile) : null;
  const skills = sections.skills ? extractSkillsFromSection(sections.skills) : [];
  const languages = sections.languages ? extractLanguagesFromSection(sections.languages) : [];
  const education = sections.education ? extractEducationFromSection(sections.education) : [];
  const experience = sections.experience ? extractExperienceFromSection(sections.experience) : [];
  const projects = sections.projects ? extractProjectsFromSection(sections.projects) : [];

  return {
    contact,
    ...(summary ? { summary } : {}),
    ...(skills.length ? { skills } : {}),
    ...(languages.length ? { languages } : {}),
    ...(education.length ? { education } : {}),
    ...(experience.length ? { experience } : {}),
    ...(projects.length ? { projects } : {}),
  };
}

function mergeParsedData(primary: Record<string, unknown>, fallback: Record<string, unknown>): Record<string, unknown> {
  const primaryContact = (primary.contact && typeof primary.contact === 'object' ? primary.contact : {}) as Record<string, unknown>;
  const fallbackContact = (fallback.contact && typeof fallback.contact === 'object' ? fallback.contact : {}) as Record<string, unknown>;

  const mergedContact: Record<string, unknown> = { ...fallbackContact };
  for (const [key, value] of Object.entries(primaryContact)) {
    if (typeof value === 'string' && value.trim()) mergedContact[key] = value.trim();
    if (Array.isArray(value) && value.length) mergedContact[key] = value;
  }

  const mergeList = (a: unknown, b: unknown): string[] => {
    const left = asStringArray(a);
    const right = asStringArray(b);
    return uniqStrings([...left, ...right]);
  };

  const out: Record<string, unknown> = {
    ...fallback,
    ...primary,
    contact: mergedContact,
  };

  if (!asStringArray(primary.skills).length && asStringArray(fallback.skills).length) {
    out.skills = fallback.skills;
  } else if (asStringArray(primary.skills).length && asStringArray(fallback.skills).length) {
    out.skills = mergeList(primary.skills, fallback.skills);
  }

  if (!asStringArray(primary.languages).length && asStringArray(fallback.languages).length) {
    out.languages = fallback.languages;
  } else if (asStringArray(primary.languages).length && asStringArray(fallback.languages).length) {
    out.languages = mergeList(primary.languages, fallback.languages);
  }

  if (!asTrimmedString(primary.summary) && asTrimmedString(fallback.summary)) {
    out.summary = fallback.summary;
  }

  const expPrimary = Array.isArray(primary.experience) ? primary.experience : [];
  const expFallback = Array.isArray(fallback.experience) ? fallback.experience : [];
  if (expPrimary.length === 0 && expFallback.length > 0) out.experience = expFallback;

  const eduPrimary = Array.isArray(primary.education) ? primary.education : [];
  const eduFallback = Array.isArray(fallback.education) ? fallback.education : [];
  if (eduPrimary.length === 0 && eduFallback.length > 0) out.education = eduFallback;

  const projPrimary = Array.isArray(primary.projects) ? primary.projects : [];
  const projFallback = Array.isArray(fallback.projects) ? fallback.projects : [];
  if (projPrimary.length === 0 && projFallback.length > 0) out.projects = projFallback;

  return out;
}

function parseModelJson<T = unknown>(raw: string): { value: T; recovered: boolean } {
  const parsed = parseJsonWithRecovery<T>(raw);
  if (!parsed.ok) {
    const err = 'error' in parsed && parsed.error instanceof Error
      ? parsed.error
      : new Error('Failed to parse JSON from model output');
    throw err;
  }
  return { value: parsed.value, recovered: parsed.recovered };
}

function clampScore(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

function pickTemplateKey(candidate: CandidateEntity, fallback: CvTemplateKey): CvTemplateKey {
  const value = candidate.cvTemplateKey ?? undefined;
  return isCvTemplateKey(value) ? value : fallback;
}

async function getDefaultTemplateKey(strapi: Core.Strapi): Promise<CvTemplateKey> {
  try {
    const store = strapi.store({ type: 'core', name: 'cv-templates' });
    const stored = await store.get({ key: 'defaultCvTemplateKey' });
    return isCvTemplateKey(stored) ? stored : 'standard';
  } catch {
    return 'standard';
  }
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);
}

function uniqStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function normalizeDateText(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let out = input.trim();
  if (!out) return null;

  out = out.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [rx, replacement] of MONTH_MAP) out = out.replace(rx, replacement);

  out = out.replace(/\bactuellement\b|\ben cours\b/gi, 'Present');
  out = out.replace(/[\s-]+$/, '').trim();
  out = out.replace(/^[\s-]+$/, '').trim();

  return out || null;
}

function normalizeParsedData(parsed: Record<string, unknown>): Record<string, unknown> {
  const contactRaw = (parsed.contact && typeof parsed.contact === 'object' ? parsed.contact : {}) as Record<string, unknown>;

  const contact = {
    fullName: asTrimmedString(contactRaw.fullName),
    email: asTrimmedString(contactRaw.email),
    phone: asTrimmedString(contactRaw.phone),
    location: asTrimmedString(contactRaw.location),
    links: uniqStrings(asStringArray(contactRaw.links)),
  };

  const skills = uniqStrings(asStringArray(parsed.skills));

  const experienceRaw = Array.isArray(parsed.experience) ? parsed.experience : [];
  let experience = experienceRaw
    .map((row: any) => {
      const company = asTrimmedString(row?.company);
      const title = asTrimmedString(row?.title);
      const startDate = normalizeDateText(row?.startDate);
      const endDate = normalizeDateText(row?.endDate);
      const highlights = uniqStrings(asStringArray(row?.highlights));
      if (!company && !title && !startDate && !endDate && highlights.length === 0) return null;
      return {
        ...(company ? { company } : {}),
        ...(title ? { title } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(highlights.length ? { highlights } : {}),
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  const educationRaw = Array.isArray(parsed.education) ? parsed.education : [];
  let education = educationRaw
    .map((row: any) => {
      const school = asTrimmedString(row?.school);
      const degree = asTrimmedString(row?.degree);
      const startDate = normalizeDateText(row?.startDate);
      const endDate = normalizeDateText(row?.endDate);
      if (!school && !degree && !startDate && !endDate) return null;
      return {
        ...(school ? { school } : {}),
        ...(degree ? { degree } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  // Post-processing: fix misclassified education and experience entries
  const eduKeywords = /\b(universit|institut|facult|school|college|acad|isims|isim|isg|isi\b|istic|ensi|enis|enet|esprit|insat|supcom|polytech|licence|bachelor|master|doctorat|mba|diplom|engineer|ing[\u00e9e]nieur|bts|dut|student|[\u00e9e]tudiant|[\u00e9e]l[\u00e8e]ve)\b/i;
  const internKeywords = /\b(intern|internship|stage|stagiaire)\b/i;

  const misclassifiedAsExp: Array<Record<string, unknown>> = [];
  experience = experience.filter((entry) => {
    const company = String(entry.company ?? '').toLowerCase();
    const title = String(entry.title ?? '').toLowerCase();
    const combined = `${company} ${title}`;

    const looksLikeEdu = eduKeywords.test(combined) && !internKeywords.test(combined);
    const matchesEduSchool = company && education.some((edu) => {
      const school = String(edu.school ?? '').toLowerCase();
      return school && (company.includes(school) || school.includes(company));
    });

    if (looksLikeEdu || matchesEduSchool) {
      misclassifiedAsExp.push(entry);
      return false;
    }
    return true;
  });

  for (const entry of misclassifiedAsExp) {
    const school = asTrimmedString(entry.company) || asTrimmedString(entry.title);
    const degree = asTrimmedString(entry.title) || null;
    const startDate = asTrimmedString(entry.startDate) || null;
    const endDate = asTrimmedString(entry.endDate) || null;

    const existing = education.find((edu) => {
      const existingSchool = String(edu.school ?? '').toLowerCase();
      const newSchool = (school ?? '').toLowerCase();
      return existingSchool && newSchool && (
        existingSchool.includes(newSchool) || newSchool.includes(existingSchool)
      );
    });

    if (existing) {
      if (!existing.startDate && startDate) existing.startDate = startDate;
      if (!existing.endDate && endDate) existing.endDate = endDate;
      if ((!existing.degree || existing.degree === 'Education') && degree && degree !== school) {
        existing.degree = degree;
      }
    } else {
      education.push({
        ...(school ? { school } : {}),
        ...(degree && degree !== school ? { degree } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });
    }
  }

  const misclassifiedAsEdu: Array<Record<string, unknown>> = [];
  education = education.filter((entry) => {
    const school = String(entry.school ?? '').toLowerCase();
    const degree = String(entry.degree ?? '').toLowerCase();
    const combined = `${school} ${degree}`;

    if (internKeywords.test(combined) && !eduKeywords.test(combined)) {
      misclassifiedAsEdu.push(entry);
      return false;
    }
    return true;
  });

  for (const entry of misclassifiedAsEdu) {
    experience.push({
      ...(entry.school ? { company: entry.school } : {}),
      ...(entry.degree ? { title: entry.degree } : {}),
      ...(entry.startDate ? { startDate: entry.startDate } : {}),
      ...(entry.endDate ? { endDate: entry.endDate } : {}),
    });
  }

  const projectsRaw = Array.isArray(parsed.projects) ? parsed.projects : [];
  const projects = projectsRaw
    .map((row: any) => {
      const name = asTrimmedString(row?.name);
      const description = asTrimmedString(row?.description);
      const links = uniqStrings(asStringArray(row?.links));
      if (!name && !description && links.length === 0) return null;
      return {
        ...(name ? { name } : {}),
        ...(description ? { description } : {}),
        ...(links.length ? { links } : {}),
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  const summary = asTrimmedString(parsed.summary);
  const certifications = uniqStrings(asStringArray(parsed.certifications));

  const COMPETENCY_THRESHOLD = 40;
  const VERB_START = /^(built|created|designed|developed|implemented|added|set\s+up|managed|led|reduced|improved|introduced|wrote|deployed|integrated|maintained|established|architected|automated|configured|migrated|optimized|launched|delivered|coordinated|conducted)/i;
  const pureSkills: string[] = [];
  const autoCompetencies: string[] = [];
  for (const s of skills) {
    if (s.length > COMPETENCY_THRESHOLD || VERB_START.test(s) || (s.includes(' ') && s.split(' ').length > 5)) {
      autoCompetencies.push(s);
    } else {
      pureSkills.push(s);
    }
  }
  const parsedCompetencies = uniqStrings(asStringArray(parsed.competencies));
  const competencies = uniqStrings([...autoCompetencies, ...parsedCompetencies]);

  const skillLower = new Set(pureSkills.map((s) => s.toLowerCase()));
  const techExtracted: string[] = [];

  const TECH_TOKEN_RX =
    /\b([A-Z][a-z]+(?:[A-Z][a-zA-Z]*)+)\b|(?<![.\w])([A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)+)(?![.\w])|\b(C\+\+|C#|F#)\b/g;

  const KNOWN_LOWER: Set<string> = new Set([
    'react', 'angular', 'vue', 'svelte', 'nextjs', 'nuxtjs', 'gatsby',
    'node', 'nodejs', 'express', 'expressjs', 'nestjs', 'fastify', 'hapi', 'koa',
    'django', 'flask', 'fastapi', 'rails', 'laravel', 'symfony', 'spring', 'springboot',
    'typescript', 'javascript', 'python', 'java', 'kotlin', 'swift', 'rust', 'golang', 'go',
    'ruby', 'php', 'perl', 'scala', 'elixir', 'haskell', 'clojure', 'dart', 'lua',
    'html', 'css', 'sass', 'scss', 'less', 'tailwind', 'tailwindcss', 'bootstrap',
    'sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'mariadb', 'oracle',
    'mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb', 'couchdb', 'neo4j',
    'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'gitlab', 'github',
    'aws', 'azure', 'gcp', 'firebase', 'heroku', 'vercel', 'netlify', 'cloudflare',
    'graphql', 'rest', 'grpc', 'websocket', 'socket.io',
    'webpack', 'vite', 'esbuild', 'rollup', 'parcel', 'babel',
    'jest', 'mocha', 'cypress', 'playwright', 'selenium', 'vitest',
    'git', 'linux', 'nginx', 'apache', 'kafka', 'rabbitmq',
    'figma', 'sketch', 'photoshop', 'illustrator',
    'tensorflow', 'pytorch', 'keras', 'pandas', 'numpy', 'scikit-learn', 'opencv',
    'unity', 'unreal', 'flutter', 'reactnative', 'ionic', 'xamarin',
    'strapi', 'contentful', 'sanity', 'wordpress', 'drupal',
    'jira', 'trello', 'confluence', 'slack', 'notion',
    'oauth', 'jwt', 'saml', 'ldap',
    'ci/cd', 'cicd', 'devops', 'agile', 'scrum',
    'hadoop', 'spark', 'airflow', 'dbt', 'snowflake', 'bigquery',
    'power bi', 'tableau', 'looker', 'grafana', 'prometheus',
    'solidity', 'web3', 'ethereum', 'blockchain',
  ]);

  const WORD_SPLIT_RX = /[^a-zA-Z0-9+#/.]+/;

  for (const comp of competencies) {
    let m: RegExpExecArray | null;
    TECH_TOKEN_RX.lastIndex = 0;
    while ((m = TECH_TOKEN_RX.exec(comp)) !== null) {
      const token = (m[1] || m[2] || m[3]).trim();
      if (token && !skillLower.has(token.toLowerCase())) {
        techExtracted.push(token);
        skillLower.add(token.toLowerCase());
      }
    }

    const words = comp.split(WORD_SPLIT_RX);
    for (const w of words) {
      const lower = w.toLowerCase();
      if (!lower || lower.length < 2) continue;
      if (KNOWN_LOWER.has(lower) && !skillLower.has(lower)) {
        techExtracted.push(w);
        skillLower.add(lower);
      }
    }
  }

  const finalSkills = uniqStrings([...pureSkills, ...techExtracted]);

  return {
    ...parsed,
    contact,
    skills: finalSkills,
    competencies,
    experience,
    education,
    projects,
    ...(summary ? { summary } : {}),
    certifications,
  };
}

function normalizeSkillKey(input: string): string {
  let s = input
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  s = s.replace(/\bmango\s*db\b/g, 'mongodb').replace(/\bmongo\s*db\b/g, 'mongodb');
  return s;
}

function compactSkillKey(input: string): string {
  return normalizeSkillKey(input).replace(/\s+/g, '');
}

function resolveAliasGroup(compact: string): { canonical: string; aliases: string[] } {
  for (const [canonical, aliases] of Object.entries(SKILL_ALIAS_GROUPS)) {
    const aliasCompacts = aliases.map((v) => compactSkillKey(v));
    if (compact === compactSkillKey(canonical) || aliasCompacts.includes(compact)) {
      return { canonical, aliases };
    }
  }
  return { canonical: compact, aliases: [] };
}

function buildSkillVariants(skill: string): Set<string> {
  const base = normalizeSkillKey(skill);
  const compact = compactSkillKey(skill);
  const { canonical, aliases } = resolveAliasGroup(compact);
  const out = new Set<string>();
  if (base) out.add(base);
  if (compact) out.add(compact);

  const canonicalKey = normalizeSkillKey(canonical);
  const canonicalCompact = compactSkillKey(canonical);
  if (canonicalKey) out.add(canonicalKey);
  if (canonicalCompact) out.add(canonicalCompact);

  for (const alias of aliases) {
    const k = normalizeSkillKey(alias);
    const c = compactSkillKey(alias);
    if (k) out.add(k);
    if (c) out.add(c);
  }

  return out;
}

function buildEvidence(parsed: Record<string, unknown>): {
  textNormalized: string;
  textCompact: string;
  skillKeys: Set<string>;
} {
  const skills = asStringArray(parsed.skills);
  const skillKeys = new Set<string>();
  for (const s of skills) {
    const k = normalizeSkillKey(s);
    const c = compactSkillKey(s);
    if (k) skillKeys.add(k);
    if (c) skillKeys.add(c);
  }

  const parts: string[] = [];
  if (typeof parsed.summary === 'string') parts.push(parsed.summary);

  const experience = Array.isArray(parsed.experience) ? parsed.experience : [];
  for (const row of experience as any[]) {
    if (typeof row?.title === 'string') parts.push(row.title);
    if (typeof row?.company === 'string') parts.push(row.company);
    for (const h of asStringArray(row?.highlights)) parts.push(h);
  }

  const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
  for (const row of projects as any[]) {
    if (typeof row?.name === 'string') parts.push(row.name);
    if (typeof row?.description === 'string') parts.push(row.description);
    for (const link of asStringArray(row?.links)) parts.push(link);
  }

  const textNormalized = normalizeSkillKey(parts.join(' '));
  const textCompact = textNormalized.replace(/\s+/g, '');

  return { textNormalized, textCompact, skillKeys };
}

function hasSkillMatch(requiredSkill: string, evidence: { textNormalized: string; textCompact: string; skillKeys: Set<string> }): boolean {
  const variants = buildSkillVariants(requiredSkill);
  for (const variant of variants) {
    if (!variant) continue;
    if (evidence.skillKeys.has(variant)) return true;

    if (variant.includes(' ')) {
      if (evidence.textNormalized.includes(variant)) return true;
    } else if (evidence.textCompact.includes(variant)) {
      return true;
    }
  }
  return false;
}

function parseLooseDate(input: unknown): Date | null {
  const normalized = normalizeDateText(input);
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  if (['present', 'now', 'current', 'today'].includes(lower)) return new Date();

  const yearOnly = /^(\d{4})$/.exec(normalized);
  if (yearOnly) {
    const y = Number(yearOnly[1]);
    if (y >= 1900 && y <= 2100) return new Date(Date.UTC(y, 0, 1));
  }

  const ym = /^(\d{4})[\/-](\d{1,2})$/.exec(normalized);
  if (ym) {
    const y = Number(ym[1]);
    const m = Number(ym[2]);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12) return new Date(Date.UTC(y, m - 1, 1));
  }

  const my = /^(\d{1,2})[\/-](\d{4})$/.exec(normalized);
  if (my) {
    const m = Number(my[1]);
    const y = Number(my[2]);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12) return new Date(Date.UTC(y, m - 1, 1));
  }

  const monthNames: Record<string, number> = {
    january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
    may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
    september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10,
    december: 11, dec: 11,
  };

  const monthYearMatch = /^([a-zA-Z]+)\.?\s+(\d{4})$/i.exec(normalized);
  if (monthYearMatch) {
    const monthKey = monthYearMatch[1].toLowerCase();
    const year = Number(monthYearMatch[2]);
    if (monthKey in monthNames && year >= 1900 && year <= 2100) {
      return new Date(Date.UTC(year, monthNames[monthKey], 1));
    }
  }

  const yearMonthMatch = /^(\d{4})\s+([a-zA-Z]+)\.?$/i.exec(normalized);
  if (yearMonthMatch) {
    const year = Number(yearMonthMatch[1]);
    const monthKey = yearMonthMatch[2].toLowerCase();
    if (monthKey in monthNames && year >= 1900 && year <= 2100) {
      return new Date(Date.UTC(year, monthNames[monthKey], 1));
    }
  }

  const dayMonthYear = /^(\d{1,2})\s+([a-zA-Z]+)\.?\s+(\d{4})$/i.exec(normalized);
  if (dayMonthYear) {
    const d = Number(dayMonthYear[1]);
    const monthKey = dayMonthYear[2].toLowerCase();
    const y = Number(dayMonthYear[3]);
    if (monthKey in monthNames && y >= 1900 && y <= 2100 && d >= 1 && d <= 31) {
      return new Date(Date.UTC(y, monthNames[monthKey], d));
    }
  }

  const monthDayYear = /^([a-zA-Z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/i.exec(normalized);
  if (monthDayYear) {
    const monthKey = monthDayYear[1].toLowerCase();
    const d = Number(monthDayYear[2]);
    const y = Number(monthDayYear[3]);
    if (monthKey in monthNames && y >= 1900 && y <= 2100 && d >= 1 && d <= 31) {
      return new Date(Date.UTC(y, monthNames[monthKey], d));
    }
  }

  const dmy = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(normalized);
  if (dmy) {
    const a = Number(dmy[1]);
    const b = Number(dmy[2]);
    const y = Number(dmy[3]);
    if (y >= 1900 && y <= 2100 && a >= 1 && a <= 31 && b >= 1 && b <= 31) {
      const makeDate = (day: number, month: number): Date | null => {
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        const dt = new Date(Date.UTC(y, month - 1, day));
        if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
        return dt;
      };

      const dm = makeDate(a, b);
      const md = makeDate(b, a);

      if (dm && md) {
        const now = new Date();
        const dmPast = dm.getTime() <= now.getTime();
        const mdPast = md.getTime() <= now.getTime();
        if (dmPast && !mdPast) return dm;
        if (mdPast && !dmPast) return md;
        return dm; // default to day/month when ambiguous
      }

      return dm || md;
    }
  }

  const ymd = /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/.exec(normalized);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(Date.UTC(y, m - 1, d));
    }
  }

  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed);
}

function parseDateRange(input: unknown): { start: Date | null; end: Date | null } | null {
  const normalized = normalizeDateText(input);
  if (!normalized) return null;

  const parts = normalized.split(/\s+(?:-|–|—|to|until|au)\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const start = parseLooseDate(parts[0]);
  const end = parseLooseDate(parts[1]);
  if (!start && !end) return null;

  return { start, end };
}

function calculateExperienceYears(parsed: Record<string, unknown>): number {
  const experience = Array.isArray(parsed.experience) ? parsed.experience : [];
  let totalMs = 0;

  for (const row of experience as any[]) {
    let start = parseLooseDate(row?.startDate);
    let end = parseLooseDate(row?.endDate);

    if ((!start || !end) && typeof row?.startDate === 'string') {
      const range = parseDateRange(row.startDate);
      if (range) {
        if (!start && range.start) start = range.start;
        if (!end && range.end) end = range.end;
      }
    }

    if (!end) end = new Date();
    if (start && end && end.getTime() < start.getTime()) {
      const tmp = start;
      start = end;
      end = tmp;
    }
    if (!start || !end) continue;
    const delta = Math.max(0, end.getTime() - start.getTime());
    totalMs += delta;
  }

  return totalMs / (365.25 * 24 * 60 * 60 * 1000);
}

function normalizeSkills(skills: string[]): string[] {
  return skills.map((skill) => skill.toLowerCase().trim()).filter(Boolean);
}

function calculateCompletenessScore(parsed: Record<string, unknown>, contact: ResumeContact): number {
  let points = 0;
  const maxPoints = 100;

  if (contact.fullName) points += 10;
  if (contact.email) points += 15;
  if (contact.phone) points += 5;
  if (contact.location) points += 5;

  if (contact.linkedin) points += 5;
  if (contact.portfolio) points += 5;

  if (asTrimmedString(parsed.summary)) points += 10;
  if (asStringArray(parsed.skills).length > 0) points += 5;

  const experience = Array.isArray(parsed.experience) ? parsed.experience : [];
  if (experience.length > 0) points += 15;
  if (experience.some((row: any) => normalizeDateText(row?.startDate) && normalizeDateText(row?.endDate))) {
    points += 10;
  }

  const education = Array.isArray(parsed.education) ? parsed.education : [];
  if (education.length > 0) points += 10;

  const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
  if (projects.length > 0) points += 5;

  return Math.min(points, maxPoints);
}

function computeMissingFields(parsed: Record<string, unknown>, contact: ResumeContact, candidateMeta?: { linkedin?: string; portfolio?: string }): string[] {
  const missing: string[] = [];
  const skills = asStringArray(parsed.skills);
  const experience = Array.isArray(parsed.experience) ? parsed.experience : [];
  const education = Array.isArray(parsed.education) ? parsed.education : [];
  const projects = Array.isArray(parsed.projects) ? parsed.projects : [];

  if (!contact.fullName) missing.push('fullName');
  if (!contact.email) missing.push('email');
  if (!contact.phone) missing.push('phone');
  if (!contact.location) missing.push('location');
  if (!contact.linkedin && !candidateMeta?.linkedin) missing.push('linkedin');
  if (!contact.portfolio && !candidateMeta?.portfolio) missing.push('portfolio');
  if (!asTrimmedString(parsed.summary)) missing.push('summary');
  if (skills.length === 0) missing.push('skills');

  if (experience.length === 0) {
    missing.push('experience');
  }

  const hasDatedExperience = experience.some((row: any) =>
    normalizeDateText(row?.startDate) && normalizeDateText(row?.endDate)
  );
  if (!hasDatedExperience) missing.push('experienceDates');

  if (education.length === 0) missing.push('education');
  if (projects.length === 0) missing.push('projects');

  return missing;
}

function computeParseConfidence(missingFields: string[]): number {
  const weights: Record<string, number> = {
    fullName: 1,
    email: 1,
    phone: 0.5,
    location: 0.5,
    linkedin: 0.5,
    portfolio: 0.5,
    summary: 1,
    skills: 2,
    experience: 2,
    experienceDates: 1,
    education: 1,
    projects: 0.5,
  };

  const totalWeight = Object.values(weights).reduce((sum, val) => sum + val, 0);
  const missingWeight = missingFields.reduce((sum, field) => sum + (weights[field] ?? 0), 0);
  if (totalWeight <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((totalWeight - missingWeight) / totalWeight) * 100)));
}

export function deterministicEvaluate(
  requirements: Requirements | unknown,
  parsed: Record<string, unknown>,
  candidateMeta?: { linkedin?: string; portfolio?: string }
): EvaluationResult {
  const requirementsObj = (requirements && typeof requirements === 'object' ? requirements : {}) as Record<string, unknown>;
  const requiredSkills = asStringArray((requirementsObj as any).skillsRequired);
  const niceToHaveSkills = asStringArray((requirementsObj as any).skillsNiceToHave);

  const evidence = buildEvidence(parsed);
  const skillsMatched = requiredSkills.filter((skill) => hasSkillMatch(skill, evidence));
  const skillsMissing = requiredSkills.filter((skill) => !hasSkillMatch(skill, evidence));
  const niceToHaveMatched = niceToHaveSkills.filter((skill) => hasSkillMatch(skill, evidence));

  const requiredCoverage = requiredSkills.length > 0
    ? (skillsMatched.length / requiredSkills.length) * 100
    : 100;
  const niceToHaveCoverage = niceToHaveSkills.length > 0
    ? (niceToHaveMatched.length / niceToHaveSkills.length) * 100
    : 0;

  const minYearsRaw = typeof (requirementsObj as any).minYearsExperience === 'number'
    ? (requirementsObj as any).minYearsExperience
    : Number((requirementsObj as any).minYearsExperience);
  const minYears = Number.isFinite(minYearsRaw) && minYearsRaw > 0 ? minYearsRaw : 0;
  const experienceYears = calculateExperienceYears(parsed);
  const experienceMatch = experienceYears >= minYears;
  const experienceScore = minYears > 0
    ? Math.min((experienceYears / minYears) * 100, 100)
    : 100;

  const fitScore = (requiredCoverage * 0.75) + (niceToHaveCoverage * 0.15) + (experienceScore * 0.10);

  const contact = buildContact(parsed);
  const completenessScore = calculateCompletenessScore(parsed, {
    ...contact,
    linkedin: contact.linkedin ?? candidateMeta?.linkedin,
    portfolio: contact.portfolio ?? candidateMeta?.portfolio,
  });

  let score = (fitScore * 0.75) + (completenessScore * 0.25);
  const experienceRows = Array.isArray(parsed.experience) ? parsed.experience : [];
  const skillRows = asStringArray(parsed.skills);
  const criticalMissing = [
    !contact.fullName,
    !contact.email,
    skillRows.length === 0,
    experienceRows.length === 0,
  ].filter(Boolean).length;

  if (criticalMissing > 0) {
    score = Math.min(score, completenessScore);
  }
  if (criticalMissing >= 2) {
    score = Math.min(score, Math.max(0, completenessScore - 10));
  }
  const missingFields = computeMissingFields(parsed, contact, candidateMeta);
  const parseConfidence = computeParseConfidence(missingFields);
  const needsReview = parseConfidence < 60;

  if (parseConfidence < 70) {
    score = Math.min(score, parseConfidence + 10);
  }
  if (parseConfidence < 50) {
    score = Math.min(score, parseConfidence + 5);
  }

  let qualityLabel = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';
  if (parseConfidence < 50) {
    qualityLabel = 'poor';
  } else if (needsReview && qualityLabel === 'excellent') {
    qualityLabel = 'good';
  }

  return {
    score: Math.round(score * 100) / 100,
    breakdown: {
      fitScore: Math.round(fitScore * 100) / 100,
      completenessScore,
      skillsMatched,
      skillsMissing,
      niceToHaveMatched,
      experienceYears: Math.round(experienceYears * 10) / 10,
      experienceMatch,
    },
    qualityLabel,
    parseConfidence,
    missingFields,
    needsReview,
  };
}

function normalizeGeneratedResumeContent(content: ResumeContent): ResumeContent {
  const normalizeStart = (start: unknown, end: unknown): string | undefined => {
    const s = normalizeDateText(start);
    if (!s) return undefined;
    if (s.includes(' - ') && normalizeDateText(end)) {
      return s.split(' - ')[0]?.trim() || s;
    }
    return s;
  };

  const normalizeEnd = (end: unknown): string | undefined => {
    const e = normalizeDateText(end);
    return e || undefined;
  };

  const experience = Array.isArray(content.experience)
    ? content.experience.map((row) => ({
        ...row,
        ...(normalizeStart(row?.startDate, row?.endDate) ? { startDate: normalizeStart(row?.startDate, row?.endDate) } : {}),
        ...(normalizeEnd(row?.endDate) ? { endDate: normalizeEnd(row?.endDate) } : {}),
      }))
    : [];

  const education = Array.isArray(content.education)
    ? content.education.map((row) => ({
        ...row,
        ...(normalizeDateText(row?.startDate) ? { startDate: normalizeDateText(row?.startDate) as string } : {}),
        ...(normalizeDateText(row?.endDate) ? { endDate: normalizeDateText(row?.endDate) as string } : {}),
      }))
    : undefined;

  return {
    ...content,
    skills: uniqStrings(asStringArray(content.skills)),
    experience,
    ...(education ? { education } : {}),
  };
}

function resumeContentFromParsedData(parsed: Record<string, unknown>): ResumeContent {
  const experienceRaw = Array.isArray(parsed.experience) ? parsed.experience : [];
  const experience = experienceRaw
    .map((row: any) => {
      const company = asTrimmedString(row?.company);
      const title = asTrimmedString(row?.title);
      const startDate = normalizeDateText(row?.startDate);
      const endDate = normalizeDateText(row?.endDate);
      const highlights = uniqStrings(asStringArray(row?.highlights));
      if (!company && !title && !startDate && !endDate && highlights.length === 0) return null;
      return {
        ...(company ? { company } : {}),
        ...(title ? { title } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(highlights.length ? { highlights } : {}),
      };
    })
    .filter(Boolean) as NonNullable<ResumeContent['experience']>;

  const educationRaw = Array.isArray(parsed.education) ? parsed.education : [];
  const education = educationRaw
    .map((row: any) => {
      const school = asTrimmedString(row?.school);
      const degree = asTrimmedString(row?.degree);
      const startDate = normalizeDateText(row?.startDate);
      const endDate = normalizeDateText(row?.endDate);
      if (!school && !degree && !startDate && !endDate) return null;
      return {
        ...(school ? { school } : {}),
        ...(degree ? { degree } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      };
    })
    .filter(Boolean) as NonNullable<ResumeContent['education']>;

  const projectsRaw = Array.isArray(parsed.projects) ? parsed.projects : [];
  const projects = projectsRaw
    .map((row: any) => {
      const name = asTrimmedString(row?.name);
      const description = asTrimmedString(row?.description);
      const links = uniqStrings(asStringArray(row?.links));
      if (!name && !description && links.length === 0) return null;
      return {
        ...(name ? { name } : {}),
        ...(description ? { description } : {}),
        ...(links.length ? { links } : {}),
      };
    })
    .filter(Boolean) as NonNullable<ResumeContent['projects']>;

  return {
    ...(asTrimmedString(parsed.summary) ? { summary: asTrimmedString(parsed.summary) as string } : {}),
    skills: uniqStrings(asStringArray(parsed.skills)),
    experience,
    ...(education.length ? { education } : {}),
    certifications: uniqStrings(asStringArray(parsed.certifications)),
    ...(projects.length ? { projects } : {}),
    languages: uniqStrings(asStringArray(parsed.languages)),
    qualities: uniqStrings(asStringArray(parsed.qualities)),
    interests: uniqStrings(asStringArray(parsed.interests)),
  };
}

function buildContact(parsed: Record<string, unknown>): ResumeContact {
  const contact = (parsed.contact && typeof parsed.contact === 'object' ? parsed.contact : {}) as Record<string, unknown>;
  return {
    fullName: asTrimmedString(contact.fullName) ?? undefined,
    email: asTrimmedString(contact.email) ?? undefined,
    phone: asTrimmedString(contact.phone) ?? undefined,
    location: asTrimmedString(contact.location) ?? undefined,
    linkedin: asTrimmedString((contact as any).linkedin) ?? undefined,
    portfolio: asTrimmedString((contact as any).portfolio) ?? undefined,
    links: uniqStrings(asStringArray(contact.links)),
  };
}

export async function processCandidate(candidateId: number, strapi: Core.Strapi): Promise<void> {
  const startedAt = Date.now();
  let stage = 'init';
  const log = (level: 'info' | 'warn' | 'error', message: string) => {
    strapi?.log?.[level]?.(`[candidate-ai] ${message}`);
  };

  stage = 'load-candidate';
  const candidate = (await strapi.entityService.findOne('api::candidate.candidate', candidateId, {
    populate: ['resume', 'job_posting'],
  })) as CandidateEntity | null;

  if (!candidate) return;

  stage = 'load-template';
  const defaultTemplateKey = await getDefaultTemplateKey(strapi);
  const templateKey = pickTemplateKey(candidate, defaultTemplateKey);
  const resume = Array.isArray(candidate.resume) ? candidate.resume[0] : candidate.resume;
  if (!resume?.url) return;

  log('info', `Start candidate ${candidateId}`);
  await strapi.entityService.update('api::candidate.candidate', candidateId, {
    data: { status: 'processing' },
  });

  try {
    stage = 'extract-text';
    const t0 = Date.now();
    const cvTextRaw = await extractTextFromResume(resume as any, strapi);
    const cvText = normalizeCvText(cvTextRaw);
    log('info', `candidate ${candidateId} extracted text in ${Date.now() - t0}ms`);
    if (!cvText.trim()) {
      strapi.log.warn(`[candidate-ai] No text extracted for candidate ${candidateId}`);
      await strapi.entityService.update('api::candidate.candidate', candidateId, {
        data: { status: 'error', hrNotes: 'No text could be extracted from the resume.' },
      });
      return;
    }

    const maxCvChars = Number(process.env.CANDIDATE_AI_MAX_CV_CHARS ?? 18000);
    const cvForModel = Number.isFinite(maxCvChars) && maxCvChars > 1000
      ? truncateForModel(cvText, maxCvChars)
      : cvText;

    stage = 'parse-resume';
    const t1 = Date.now();
    const parsedModel = parseModelJson<Record<string, unknown>>(
      await ollamaChat({
        system: PARSER_SYSTEM_PROMPT,
        user: cvForModel,
        format: 'json',
        timeoutMs: Number(process.env.CANDIDATE_AI_PARSE_TIMEOUT_MS ?? 120000),
        ollamaOptions: { num_predict: Number(process.env.OLLAMA_NUM_PREDICT_PARSE ?? 900) },
      })
    );
    if (parsedModel.recovered) {
      log('warn', `candidate ${candidateId} parser output required JSON recovery`);
    }
    log('info', `candidate ${candidateId} parsed CV in ${Date.now() - t1}ms`);

    const heuristicParsed = parseResumeHeuristic(cvText);
    const mergedParsed = mergeParsedData(parsedModel.value, heuristicParsed);
    const parsed = normalizeParsedData(mergedParsed);

    stage = 'evaluate';
    const t2 = Date.now();
    const evaluation = deterministicEvaluate(candidate.job_posting?.requirements ?? {}, parsed, {
      linkedin: candidate.linkedin ?? undefined,
      portfolio: candidate.portfolio ?? undefined,
    });
    log('info', `candidate ${candidateId} evaluated deterministically in ${Date.now() - t2}ms`);

    const evalCompact = {
      score: evaluation.score,
      fitScore: evaluation.breakdown.fitScore,
      completenessScore: evaluation.breakdown.completenessScore,
      matchedSkills: evaluation.breakdown.skillsMatched,
      missingSkills: evaluation.breakdown.skillsMissing,
      niceToHaveMatched: evaluation.breakdown.niceToHaveMatched,
      experienceYears: evaluation.breakdown.experienceYears,
      experienceMatch: evaluation.breakdown.experienceMatch,
      qualityLabel: evaluation.qualityLabel,
    };

    const generatorInput =
      `Candidate extracted data (JSON):\n${JSON.stringify(parsed)}\n\n` +
      `Evaluation (JSON):\n${JSON.stringify(evalCompact)}\n\n` +
      'Generate strong but truthful bullet highlights. If some fields are missing, omit the section or use a short placeholder like "(Information not provided)".';

    stage = 'generate-resume';
    const t3 = Date.now();
    const generatedRaw = await ollamaChat({
      system: GENERATOR_SYSTEM_PROMPT,
      user: generatorInput,
      format: 'json',
      timeoutMs: Number(process.env.CANDIDATE_AI_GENERATE_TIMEOUT_MS ?? 180000),
      ollamaOptions: { num_predict: Number(process.env.OLLAMA_NUM_PREDICT_GENERATE ?? 1400) },
    });

    let resumeContentModel: { value: ResumeContent; recovered: boolean } | null = null;
    try {
      resumeContentModel = parseModelJson<ResumeContent>(generatedRaw);
    } catch (firstError: any) {
      log('warn', `candidate ${candidateId} generator parse failed, attempting repair pass: ${firstError?.message ?? firstError}`);
      try {
        const repairedRaw = await ollamaChat({
          system: JSON_REPAIR_SYSTEM_PROMPT,
          user:
            'Repair this malformed JSON into valid JSON while preserving content exactly where possible.\n\n' +
            generatedRaw,
          format: 'json',
          timeoutMs: Number(process.env.CANDIDATE_AI_GENERATE_TIMEOUT_MS ?? 180000),
          ollamaOptions: { num_predict: Number(process.env.OLLAMA_NUM_PREDICT_GENERATE ?? 1400) },
        });
        resumeContentModel = parseModelJson<ResumeContent>(repairedRaw);
        log('warn', `candidate ${candidateId} generator parse succeeded after repair pass`);
      } catch (secondError: any) {
        log('warn', `candidate ${candidateId} generator repair failed, using extracted-data fallback: ${secondError?.message ?? secondError}`);
        resumeContentModel = { value: resumeContentFromParsedData(parsed), recovered: true };
      }
    }

    if (!resumeContentModel) {
      throw new Error('Resume generation returned no content.');
    }
    if (resumeContentModel.recovered) {
      log('warn', `candidate ${candidateId} generator output required JSON recovery`);
    }
    stage = 'render-template';
    const resumeContent = normalizeGeneratedResumeContent(resumeContentModel.value);
    log('info', `candidate ${candidateId} generated resume content in ${Date.now() - t3}ms`);

    const contact = buildContact(parsed);
    const markdown = renderCvMarkdownFromTemplate(templateKey, contact, resumeContent);

    const derivedFullName = typeof contact.fullName === 'string' ? contact.fullName : undefined;
    const derivedEmail = typeof contact.email === 'string' ? contact.email : undefined;

    await strapi.entityService.update('api::candidate.candidate', candidateId, {
      data: {
        status: 'processed',
        hrNotes: null,
        extractedData: { ...parsed, evaluation, generatedResumeContent: resumeContent, cvTemplateKeyUsed: templateKey },
        ...(evaluation.score !== null ? { score: evaluation.score } : {}),
        standardizedCvMarkdown: markdown,
        ...(!candidate.fullName && derivedFullName ? { fullName: derivedFullName } : {}),
        ...(!candidate.email && derivedEmail ? { email: derivedEmail } : {}),
      } as any,
    });
    log('info', `Done candidate ${candidateId} in ${Date.now() - startedAt}ms`);
  } catch (error: any) {
    const timestamp = new Date().toISOString();
    const message = error?.message ?? String(error);
    await strapi.entityService.update('api::candidate.candidate', candidateId, {
      data: {
        status: 'error',
        hrNotes: `AI processing failed (${stage} @ ${timestamp}): ${message}`,
      },
    });
    log('error', `Failed candidate ${candidateId} after ${Date.now() - startedAt}ms: ${error?.message ?? error}`);
    throw error;
  }
}