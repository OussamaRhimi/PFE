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

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
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

const PARSER_SYSTEM_PROMPT = `Extract CV data even if the text is fragmented or out of order. Return ONLY valid JSON.

RECOVERY STRATEGIES FOR FRAGMENTED CVs:
1. If section headers (SKILLS, EXPERIENCE) appear without content nearby, search the ENTIRE text
2. Dates like "June 2025 - August 2025" followed by text = experience entry
3. Words like "intern", "developer", "engineer" in text = job title
4. Technology names separated by dashes (–) or commas = skills list
5. Email/phone can appear ANYWHERE - always extract them
6. University names (ISIMS, ISIM, FST, ENSI, ENIS) = education
7. Pattern "Technology(Language)" like "Springboot(JAVA)" → extract BOTH as skills
8. "FRONTEND:", "BACKEND:", "DATABASES:" headers → skills follow somewhere in text

IMPORTANT DATE FORMAT: Use "Month YYYY" (e.g. "June 2025"). If only year, use "YYYY". If ongoing, use "Present".

SKILL EXTRACTION - Extract ALL technologies from:
- Explicit skills sections
- Experience highlights (e.g., "built with NextJS" → add "NextJS")
- Project descriptions
- Tools mentioned anywhere (Git, FIGMA, Docker, Talend, FileZilla, etc.)

CLASSIFICATION RULES:
- "skills": Short technology/tool names ONLY (React, Node.js, Docker, PostgreSQL, Git, FIGMA, Stripe, OAuth)
- "competencies": Achievement descriptions ("Built authentication system", "Implemented 2FA")
- "spokenLanguages": Human languages with proficiency [{ "name": "English", "level": "fluent" }]
- "education": Degrees at universities (NOT work experience)
- "experience": Jobs, internships at COMPANIES, freelance work
- "projects": Personal/academic projects with descriptions
- "tools": Development/design tools (Git, FIGMA, Postman, VS Code, Docker)

OUTPUT JSON SHAPE:
{
  "contact": { "fullName": string, "email": string, "phone": string|null, "location": string|null, "linkedin": string|null, "portfolio": string|null, "github": string|null, "links": string[] },
  "summary": string|null,
  "skills": string[],
  "tools": string[],
  "competencies": string[],
  "spokenLanguages": [{ "name": string, "level": string }],
  "experience": [{ "company": string, "title": string, "startDate": string, "endDate": string, "highlights": string[] }],
  "education": [{ "school": string, "degree": string, "startDate": string, "endDate": string }],
  "certifications": string[],
  "projects": [{ "name": string, "description": string, "technologies": string[], "links": string[] }]
}`;

const GENERATOR_SYSTEM_PROMPT = `Generate polished resume content from the candidate's extracted data.
Company style guide: concise, ATS-friendly, clear headings, bullet highlights, no tables.
Return ONLY valid JSON (no markdown, no code fences).

OUTPUT JSON SHAPE:
{
  "summary": string|null,
  "skills": string[],
  "experience": [{ "company": string, "title": string, "startDate": string, "endDate": string, "highlights": string[] }],
  "education": [{ "school": string, "degree": string, "startDate": string, "endDate": string }],
  "certifications": string[],
  "projects": [{ "name": string, "description": string, "links": string[] }],
  "languages": string[],
  "qualities": string[],
  "interests": string[]
}`;

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
  // Frontend frameworks
  react: ['reactjs', 'react js', 'react.js'],
  vue: ['vuejs', 'vue js', 'vue.js'],
  angular: ['angularjs', 'angular js'],
  nextjs: ['next js', 'next.js', 'next'],
  nuxtjs: ['nuxt js', 'nuxt.js', 'nuxt'],
  gatsby: ['gatsbyjs', 'gatsby js', 'gatsby.js'],
  svelte: ['sveltejs', 'svelte js'],
  // CSS frameworks
  tailwindcss: ['tailwind css', 'tailwind', 'tailwindcss'],
  bootstrap: ['bootstrap css', 'bootstrap5', 'bootstrap4'],
  // JavaScript/TypeScript
  typescript: ['ts', 'type script'],
  javascript: ['js', 'java script', 'ecmascript', 'es6', 'es2015', 'es2020'],
  // Backend
  nodejs: ['node js', 'node.js', 'node'],
  nestjs: ['nest js', 'nest.js', 'nest'],
  expressjs: ['express js', 'express.js', 'express'],
  springboot: ['spring boot', 'spring-boot', 'spring'],
  django: ['django rest', 'drf'],
  flask: ['flask python'],
  fastapi: ['fast api', 'fast-api'],
  // Databases
  mongodb: ['mongo db', 'mongo-db', 'mango db', 'mangodb', 'mongo'],
  mysql: ['my sql', 'mariadb'],
  postgresql: ['postgres', 'postgre sql', 'psql', 'pg'],
  sqlite: ['sql lite', 'sqlite3'],
  redis: ['redis cache'],
  elasticsearch: ['elastic search', 'elastic'],
  // Cloud & DevOps
  docker: ['docker container', 'dockerfile'],
  kubernetes: ['k8s', 'kube'],
  aws: ['amazon web services', 'amazon aws'],
  azure: ['microsoft azure'],
  gcp: ['google cloud', 'google cloud platform'],
  nginx: ['nginx server'],
  // Tools
  git: ['github', 'gitlab', 'git version control'],
  figma: ['figma design'],
  postman: ['postman api'],
  vscode: ['vs code', 'visual studio code'],
  // ORM & Data
  prisma: ['prisma orm'],
  sequelize: ['sequelize orm'],
  mongoose: ['mongoose odm'],
  typeorm: ['type orm'],
  hibernate: ['hibernate orm'],
  // Other frameworks
  dotnet: ['.net', 'dot net', 'asp.net', 'aspnet', 'asp net core'],
  csharp: ['c#', 'c sharp'],
  reactnative: ['react native', 'react-native'],
  flutter: ['flutter dart'],
  graphql: ['graph ql', 'graph-ql'],
  socketio: ['socket.io', 'socket io', 'websocket', 'websockets'],
  // AI/ML
  pytorch: ['py torch', 'torch'],
  tensorflow: ['tensor flow', 'tf'],
  langchain: ['lang chain'],
  openai: ['open ai', 'chatgpt api'],
  // ETL & BI
  talend: ['talend studio', 'talend studios'],
  kibana: ['kibana dashboard'],
  tableau: ['tableau desktop'],
  powerbi: ['power bi', 'power-bi'],
  // Auth
  oauth: ['oauth2', 'oauth 2.0', 'open auth'],
  jwt: ['json web token', 'json web tokens'],
  // Payment
  stripe: ['stripe api', 'stripe payment'],
  // Testing
  jest: ['jest testing'],
  cypress: ['cypress testing'],
  selenium: ['selenium webdriver'],
};

// Skills that are related - used for partial matching
const SKILL_ECOSYSTEM_GROUPS: Record<string, string[]> = {
  'react-ecosystem': ['react', 'redux', 'react-router', 'nextjs', 'gatsby', 'react-query', 'zustand'],
  'vue-ecosystem': ['vue', 'vuex', 'pinia', 'nuxtjs', 'vue-router'],
  'angular-ecosystem': ['angular', 'rxjs', 'ngrx', 'angular-material'],
  'node-ecosystem': ['nodejs', 'expressjs', 'nestjs', 'fastify', 'koa'],
  'python-ecosystem': ['python', 'django', 'flask', 'fastapi', 'celery'],
  'java-ecosystem': ['java', 'springboot', 'hibernate', 'maven', 'gradle'],
  'database-sql': ['mysql', 'postgresql', 'sqlite', 'mariadb', 'oracle'],
  'database-nosql': ['mongodb', 'redis', 'cassandra', 'couchdb', 'dynamodb'],
  'devops': ['docker', 'kubernetes', 'jenkins', 'gitlab-ci', 'github-actions', 'terraform'],
  'cloud': ['aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify'],
  'ai-ml': ['pytorch', 'tensorflow', 'keras', 'scikit-learn', 'langchain', 'huggingface'],
};

function truncateForModel(text: string, maxChars: number): string {
  const s = String(text ?? '');
  if (s.length <= maxChars) return s;
  const head = s.slice(0, Math.floor(maxChars * 0.65));
  const tail = s.slice(s.length - Math.floor(maxChars * 0.25));
  return `${head}\n\n[...truncated...]\n\n${tail}`;
}

// Known technology/tool names to extract from anywhere in text
const KNOWN_TECHNOLOGIES = new Set([
  // Frontend
  'react', 'reactjs', 'vue', 'vuejs', 'angular', 'svelte', 'nextjs', 'nuxtjs', 'gatsby', 'gatsbyjs',
  'html', 'css', 'sass', 'scss', 'less', 'tailwindcss', 'tailwind', 'bootstrap', 'materialui',
  'jquery', 'webpack', 'vite', 'rollup', 'parcel', 'babel',
  // JavaScript/TypeScript
  'javascript', 'typescript', 'es6', 'ecmascript',
  // Backend
  'nodejs', 'express', 'expressjs', 'nestjs', 'fastify', 'koa', 'hapi',
  'python', 'django', 'flask', 'fastapi', 'celery',
  'java', 'springboot', 'spring', 'hibernate', 'maven', 'gradle',
  'php', 'laravel', 'symfony', 'codeigniter',
  'ruby', 'rails', 'sinatra',
  'go', 'golang', 'gin', 'echo',
  'rust', 'actix', 'rocket',
  'dotnet', 'aspnet', 'csharp', 'blazor',
  // Databases
  'sql', 'nosql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'mariadb', 'oracle', 'mssql',
  'mongodb', 'mongoose', 'redis', 'memcached', 'elasticsearch', 'cassandra', 'couchdb', 'dynamodb', 'firestore',
  'prisma', 'sequelize', 'typeorm', 'knex', 'drizzle',
  // DevOps & Cloud
  'docker', 'kubernetes', 'k8s', 'jenkins', 'circleci', 'travisci', 'githubactions',
  'aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify', 'digitalocean',
  'nginx', 'apache', 'caddy', 'openlitespeed',
  'terraform', 'ansible', 'puppet', 'chef',
  // Version Control
  'git', 'github', 'gitlab', 'bitbucket', 'svn',
  // Tools
  'figma', 'sketch', 'adobexd', 'photoshop', 'illustrator',
  'postman', 'insomnia', 'swagger',
  'vscode', 'intellij', 'webstorm', 'pycharm', 'eclipse',
  'jira', 'trello', 'asana', 'notion', 'confluence',
  // Testing
  'jest', 'mocha', 'chai', 'cypress', 'playwright', 'selenium', 'puppeteer',
  'junit', 'pytest', 'rspec', 'phpunit',
  // APIs & Protocols
  'rest', 'restapi', 'graphql', 'grpc', 'websocket', 'socketio',
  'oauth', 'oauth2', 'jwt', 'saml', 'openid',
  // AI/ML
  'pytorch', 'tensorflow', 'keras', 'scikitlearn', 'pandas', 'numpy', 'matplotlib',
  'langchain', 'langgraph', 'openai', 'huggingface', 'transformers',
  'opencv', 'yolo', 'spacy', 'nltk',
  // Data/ETL
  'talend', 'airflow', 'spark', 'hadoop', 'kafka', 'rabbitmq',
  'kibana', 'grafana', 'prometheus', 'tableau', 'powerbi', 'looker',
  // Mobile
  'reactnative', 'flutter', 'swift', 'kotlin', 'xamarin', 'ionic', 'cordova',
  // CMS
  'wordpress', 'strapi', 'contentful', 'sanity', 'drupal', 'magento', 'shopify',
  // Payment
  'stripe', 'paypal', 'braintree', 'square',
  // Auth
  'firebase', 'auth0', 'okta', 'keycloak', 'cognito',
  // Real-time
  'socketio', 'pusher', 'ably', 'pubnub',
  // Other
  'linux', 'bash', 'powershell', 'regex', 'markdown',
  'agile', 'scrum', 'kanban', 'tdd', 'bdd', 'cicd',
  // BI & ETL tools
  'swr', 'thymeleaf', 'filezilla', 'putty', 'winscp',
]);

function normalizeCvText(input: string): string {
  let out = String(input ?? '');
  out = out.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  out = out.replace(/[–—]/g, '-');
  out = out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  // Insert line breaks around common headings and labels when PDFs flatten text.
  out = out.replace(/\b(Professional Summary|Summary|Profile|Technical Skills|Work Experience|Professional Experience|Education|Projects?|Languages?|Skills)\b/gi, '\n$1');
  out = out.replace(/\b(Email|Phone|Location|LinkedIn|Portfolio|Website|Github|GitHub)\b\s*[:\-]?\s*(?=[A-Za-z0-9])/gi, '\n$1: ');
  out = out.replace(/\b(Professional Summary|Summary|Profile|Technical Skills|Work Experience|Professional Experience|Education|Projects?|Languages?|Skills)\b\s*[:\-]\s*/gi, '$1\n');
  out = out.replace(/\b(Professional Summary|Summary|Profile|Work Experience|Professional Experience|Education|Projects?|Languages?)\b\s+(?=[A-Z])/g, '$1\n');
  out = out.replace(/\b(github|gitlab|linkedin)\s*[:\-]?\s*\.?\s*com\//gi, '$1.com/');
  out = out.replace(/\n\s*[-:]\s+/g, '\n');
  // Split concatenated dates/roles (e.g., "2025Web developer")
  out = out.replace(/(\d{4})(?=[A-Z])/g, '$1\n');
  // Split merged date ranges (e.g., "June 2025 - August 2025Web")
  out = out.replace(/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})(?=[A-Z])/gi, '$1\n');
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

// Extract skills from technology pattern "Tech(Lang)" like "Springboot(JAVA)"
function extractSkillsWithParentheses(text: string): string[] {
  const skills: string[] = [];
  const pattern = /(\w+)\s*\((\w+)\)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match[1] && match[1].length >= 2) skills.push(match[1]);
    if (match[2] && match[2].length >= 2) skills.push(match[2]);
  }
  return skills;
}

// Extract skills from dash-separated lists like "NextJS – ReactJS – TailwindCSS"
function extractDashSeparatedSkills(text: string): string[] {
  const skills: string[] = [];
  // Match patterns like "Tech – Tech – Tech" or "Tech - Tech - Tech"
  const dashPattern = /([A-Za-z0-9.#+-]+)\s*[–-]\s*([A-Za-z0-9.#+-]+(?:\s*[–-]\s*[A-Za-z0-9.#+-]+)*)/g;
  let match;
  while ((match = dashPattern.exec(text)) !== null) {
    const fullMatch = match[0];
    const parts = fullMatch.split(/\s*[–-]\s*/);
    for (const part of parts) {
      const cleaned = part.trim();
      if (cleaned.length >= 2 && cleaned.length <= 30 && /^[A-Za-z]/.test(cleaned)) {
        skills.push(cleaned);
      }
    }
  }
  return skills;
}

// Extract all technology names mentioned anywhere in the text
function extractTechnologiesFromText(text: string): string[] {
  const found: string[] = [];
  const textLower = text.toLowerCase().replace(/[^a-z0-9\s.#+-]/g, ' ');
  
  for (const tech of KNOWN_TECHNOLOGIES) {
    // Create word boundary pattern
    const pattern = new RegExp(`\\b${tech.replace(/[.+]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(textLower)) {
      // Capitalize properly
      const capitalized = tech.charAt(0).toUpperCase() + tech.slice(1);
      found.push(capitalized);
    }
  }
  
  return found;
}

// Extract spoken languages with proficiency levels
function extractSpokenLanguages(text: string): Array<{ name: string; level: string }> {
  const languages: Array<{ name: string; level: string }> = [];
  const langPatterns = [
    /\b(arabic|english|french|spanish|german|italian|chinese|japanese|korean|russian|portuguese|dutch|turkish|hindi|berber)\s*[:\-–]?\s*(native|fluent|conversational|intermediate|basic|beginner|b1|b2|c1|c2|a1|a2|ielts|toefl)/gi,
    /\b(native|fluent|conversational|intermediate|basic)\s+(arabic|english|french|spanish|german|italian)/gi,
  ];
  
  for (const pattern of langPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      const level = match[2].toLowerCase();
      if (!languages.some(l => l.name.toLowerCase() === name.toLowerCase())) {
        languages.push({ name, level });
      }
    }
  }
  
  return languages;
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

const TUNISIAN_CITIES = new Set([
  'tunis', 'sfax', 'sousse', 'kairouan', 'bizerte', 'gabes', 'ariana', 'gafsa',
  'monastir', 'ben arous', 'kasserine', 'mahdia', 'nabeul', 'tozeur', 'kef',
  'siliana', 'beja', 'jendouba', 'medenine', 'tataouine', 'kebili', 'zaghouan',
  'kerkennah', 'ksour essef',
]);

const MONTH_WORDS = new Set([
  'january', 'jan', 'february', 'feb', 'march', 'mar', 'april', 'apr', 'may',
  'june', 'jun', 'july', 'jul', 'august', 'aug', 'september', 'sep', 'sept',
  'october', 'oct', 'november', 'nov', 'december', 'dec',
]);

const LANGUAGE_LEVELS = new Set([
  'native', 'fluent', 'conversational', 'intermediate', 'advanced',
  'beginner', 'basic', 'professional',
]);

const SKILL_STOPWORDS = new Set([
  'advisor', 'advisors', 'analysis', 'analyst', 'and', 'agent', 'agents', 'ai',
  'based', 'basics', 'club', 'competitive', 'context', 'design', 'developer', 'development',
  'final', 'founder', 'full', 'hands', 'international', 'junior', 'management', 'model',
  'national', 'on', 'organization', 'organizations', 'part', 'present', 'problem', 'problems',
  'production', 'project', 'projects', 'ready', 'role', 'rule', 'stack', 'team', 'time',
  'world', 'year', 'years', 'student', 'assistant', 'associate', 'member', 'intern', 'internship',
  'tender', 'tenders', 'call', 'calls', 'database', 'databases', 'specification', 'specifications',
  'subject', 'telecom', 'consulting', 'company', 'university', 'institute', 'institut', 'faculty',
  'college', 'school', 'isims', 'isg', 'isi', 'insat', 'supcom', 'esprit', 'enit', 'ensi', 'enis',
  'enet', 'istic', 'polytech', 'licence', 'bachelor', 'master', 'doctorat', 'mba', 'diploma',
]);

const LOCATION_REJECT_RX = /\b(intern|internship|stage|stagiaire|developer|engineer|designer|manager|consultant|freelance|company|ltd|llc|inc|telecom|consulting|university|institute|institut|faculty|college|school|department)\b/i;
const SKILL_REJECT_RX = /\b(university|institute|institut|faculty|college|school|telecom|consulting|company|tender|call|calls|database)\b/i;

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

function scoreLocationLine(line: string): number {
  const trimmed = line.trim();
  if (!trimmed) return -1;
  if (trimmed.length > 80) return -1;

  const lower = trimmed.toLowerCase();
  if (/@|http|www\./i.test(trimmed)) return -1;
  if (/^(skills?|education|experience|projects?|summary|profile|contact|languages?|certifications?)/i.test(trimmed)) return -1;
  if (LOCATION_REJECT_RX.test(trimmed)) return -1;

  let score = 0;
  if (lower.includes('tunisia') || lower.includes('tunisie')) score += 3;
  for (const city of TUNISIAN_CITIES) {
    if (lower.includes(city)) {
      score += 2;
      break;
    }
  }
  if (trimmed.includes(',') && !/\d{4}/.test(trimmed)) score += 2;
  if (/\d/.test(trimmed)) score -= 1;
  if (/\||\u2022/.test(trimmed)) score -= 1;

  const tokens = lower.split(/[\s,|/]+/).filter(Boolean);
  let techHits = 0;
  for (const token of tokens) {
    if (KNOWN_TECHNOLOGIES.has(token)) techHits += 1;
    if (techHits >= 2) break;
  }
  if (techHits >= 2) score -= 3;

  if (/\b(native|fluent|conversational|intermediate|advanced|beginner|basic|professional)\b/.test(lower)) {
    for (const lang of KNOWN_LANGUAGES) {
      const rx = new RegExp(`\\b${lang}\\b`, 'i');
      if (rx.test(lower)) {
        score -= 2;
        break;
      }
    }
  }

  return score;
}

function pickLocationLine(lines: string[]): string | undefined {
  let bestLine: string | undefined;
  let bestScore = 0;
  for (const line of lines) {
    const score = scoreLocationLine(line);
    if (score > bestScore) {
      bestScore = score;
      bestLine = line;
    }
  }
  if (bestScore > 0) return bestLine;

  return lines.find((line) => {
    if (!line.includes(',')) return false;
    if (/@|http|www\./i.test(line)) return false;
    if (/\d{4}/.test(line)) return false;
    return line.length <= 60;
  });
}

function isLikelyLocationValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length > 80) return false;
  if (/@|http|www\./i.test(trimmed)) return false;
  if (LOCATION_REJECT_RX.test(trimmed)) return false;
  if (/\d{4}/.test(trimmed)) return false;
  if (scoreLocationLine(trimmed) > 0) return true;
  if (trimmed.includes(',') && trimmed.length <= 60 && !/\d/.test(trimmed)) return true;
  return false;
}

const EMAIL_RX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RX = /\+?\d[\d\s().-]{6,}\d/;
const LINK_RX = /(https?:\/\/[^\s]+|www\.[^\s]+|linkedin\.com\/[^\s]+|github\.com\/[^\s]+|gitlab\.com\/[^\s]+|bitbucket\.org\/[^\s]+|(?:[a-z0-9-]+\.)+(?:com|io|dev|net|org|me|tn)(?:\/[\w\-./?%#=&+]*)?)/gi;
const ACTION_VERB_RX = /^(built|created|developed|designed|implemented|managed|led|reduced|improved|introduced|wrote|deployed|integrated|maintained|established|architected|automated|configured|migrated|optimized|launched|delivered|collaborated|coordinated|conducted)/i;

function normalizeLooseUrl(raw: string): string {
  let out = raw.trim().replace(/[),.;]+$/, '');
  out = out.replace(/^(github|gitlab|linkedin)\s*:\s*\.?\s*com\//i, '$1.com/');
  out = out.replace(/^(github|gitlab|linkedin)\s*\.?\s*com\//i, '$1.com/');
  out = out.replace(/^www\./i, 'https://www.');
  if (!/^https?:\/\//i.test(out) && /^(github\.com|gitlab\.com|linkedin\.com|bitbucket\.org)/i.test(out)) {
    out = `https://${out}`;
  }
  if (!/^https?:\/\//i.test(out) && /^[a-z0-9.-]+\.(com|io|dev|net|org|me|tn)(\/|$)/i.test(out)) {
    out = `https://${out}`;
  }
  return out;
}

function extractLinksFromLine(line: string): string[] {
  if (!line) return [];
  const fixed = line
    .replace(/\b(github|gitlab|linkedin)\s*:\s*\.?\s*com\//ig, '$1.com/')
    .replace(/\b(github|gitlab|linkedin)\s*\.?\s*com\//ig, '$1.com/')
    .replace(/\s+\/\s+/g, '/');
  const matches = fixed.match(LINK_RX) || [];
  return uniqStrings(
    matches
      .map(normalizeLooseUrl)
      .filter((value) => value && !value.includes('@'))
  );
}

function findLocationLine(lines: string[]): string | undefined {
  const emailIndex = lines.findIndex((line) => EMAIL_RX.test(line));
  const phoneIndex = lines.findIndex((line) => PHONE_RX.test(line));
  const anchor = emailIndex >= 0 ? emailIndex : phoneIndex;

  if (anchor >= 0) {
    const window = lines.slice(Math.max(0, anchor - 4), Math.min(lines.length, anchor + 5));
    const near = pickLocationLine(window);
    if (near) return near;
  }

  const head = pickLocationLine(lines.slice(0, 12));
  if (head) return head;

  return pickLocationLine(lines);
}

function extractContactFromText(lines: string[]): ResumeContact {
  const joined = lines.join(' ');
  const emailMatch = joined.match(EMAIL_RX);

  const phoneMatches = joined.match(/\+?\d[\d\s().-]{6,}\d/g) || [];
  const phone = phoneMatches
    .map((p) => p.replace(/[^\d+]/g, ''))
    .sort((a, b) => b.length - a.length)[0];

  const links = uniqStrings([
    ...extractLinksFromLine(joined),
    ...lines.flatMap((line) => extractLinksFromLine(line)),
  ]);

  const linkedin = links.find(l => l.toLowerCase().includes('linkedin.com'));
  const github = links.find(l => l.toLowerCase().includes('github.com'));
  const portfolio = pickPortfolioLink(links);

  // Skip patterns that look like language entries or section headers
  const skipPatterns = [
    /^(arabic|french|english|german|spanish|italian|chinese|japanese)[\s:]/i,
    /^(native|fluent|professional|basic|beginner|intermediate|advanced)[\s|:]/i,
    /^(skills?|education|experience|projects?|summary|profile|contact|languages?|certifications?)[\s:]/i,
    /native\|/i,
    /fluent\|/i,
    /\|native/i,
    /\|fluent/i,
    /^[A-Z]{2,}:/,  // Skip things like "HTML:" or "CSS:"
  ];

  // Enhanced name detection - look for capitalized names
  const candidateName = lines.find((line) => {
    const trimmed = line.trim();
    if (trimmed.length > 60) return false;
    if (trimmed.length < 4) return false;
    if (/\d/.test(trimmed)) return false;
    if (/@|http|www\.|\.com|\.io/i.test(trimmed)) return false;
    
    // Skip language entries and section headers
    for (const pattern of skipPatterns) {
      if (pattern.test(trimmed)) return false;
    }
    
    // Check if it looks like a name (capitalized words)
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2 || parts.length > 5) return false;
    
    // All parts should be reasonable name parts (capitalize first letter, no pipes or colons)
    for (const part of parts) {
      if (part.includes(':') || part.includes('|')) return false;
      if (!/^[A-Z]/.test(part)) return false;
    }
    
    return true;
  });

  // Enhanced location detection - prefer city + country lines
  const locationLine = findLocationLine(lines);

  return {
    fullName: candidateName ? candidateName.trim() : undefined,
    email: emailMatch ? emailMatch[0].trim() : undefined,
    phone: phone ? phone.trim() : undefined,
    location: locationLine ? locationLine.trim() : undefined,
    linkedin: linkedin ? linkedin.trim() : undefined,
    portfolio: portfolio ? portfolio.trim() : (github ? github.trim() : undefined),
    links,
  };
}

function isPersonalLink(link: string): boolean {
  const lower = link.toLowerCase();
  if (lower.includes('linkedin.com')) return false;
  if (lower.includes('github.com')) return false;
  if (lower.includes('gitlab.com')) return false;
  if (lower.includes('bitbucket.org')) return false;
  return /\.(com|io|dev|net|org|me|tn)(\/|$)/i.test(lower);
}

function pickPortfolioLink(links: string[]): string | undefined {
  const personal = links.find(isPersonalLink);
  if (personal) return personal;
  return links.find((link) => link.toLowerCase().includes('github.com'));
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

function inferSummaryFromLines(lines: string[], contact: ResumeContact): string | null {
  const headingRx = /^(summary|profile|about|contact|skills?|education|experience|work experience|projects?|certifications?|languages?)\b/i;
  const urlRx = /(https?:\/\/|www\.|linkedin\.com|github\.com)/i;
  const name = contact.fullName ? contact.fullName.toLowerCase() : '';

  for (const line of lines.slice(0, 16)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 30 || trimmed.length > 220) continue;
    if (headingRx.test(trimmed)) continue;
    if (EMAIL_RX.test(trimmed) || PHONE_RX.test(trimmed) || urlRx.test(trimmed)) continue;
    if (name && trimmed.toLowerCase().includes(name)) continue;
    if (/[|•]/.test(trimmed)) continue;
    return trimmed;
  }

  return null;
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
    if (range && isMostlyDateLine(line)) {
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

const JOB_TITLE_RX = /\b(web\s*developer|software\s*engineer|developer|engineer|devops|backend|frontend|full\s*stack|intern|stagiaire|stage)\b/i;

function splitInlineHighlights(line: string): { head: string; highlights: string[] } | null {
  if (!line.includes(' - ')) return null;
  const parts = line.split(/\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const headParts: string[] = [parts[0]];
  const highlights: string[] = [];

  for (const part of parts.slice(1)) {
    if (ACTION_VERB_RX.test(part)) {
      highlights.push(part);
    } else {
      headParts.push(part);
    }
  }

  if (highlights.length === 0) return null;
  return { head: headParts.join(' - '), highlights };
}

function expandInlineHighlights(lines: string[]): string[] {
  const expanded: string[] = [];
  for (const line of lines) {
    const inline = splitInlineHighlights(line);
    if (inline) {
      expanded.push(inline.head);
      for (const h of inline.highlights) expanded.push(`- ${h}`);
      continue;
    }
    expanded.push(line);
  }
  return expanded;
}

function isExperienceStartLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^(experience|work experience|professional experience)$/i.test(trimmed)) return false;
  if (JOB_TITLE_RX.test(trimmed)) return true;
  return COMPANY_PATTERNS.some((p) => p.test(trimmed));
}

function parseTitleCompany(line: string): { title?: string; company?: string } {
  const cleaned = stripDateTokens(line).replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return {};

  const dashParts = cleaned.split(/\s+[\-–—]\s+/).map((p) => p.trim()).filter(Boolean);
  if (dashParts.length >= 2) {
    const left = dashParts[0];
    const right = dashParts.slice(1).join(' - ');
    const leftIsTitle = JOB_TITLE_RX.test(left);
    const rightIsTitle = JOB_TITLE_RX.test(right);
    if (!leftIsTitle && rightIsTitle) return { title: right, company: left };
    return { title: left, company: right };
  }

  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return { title: parts[0], company: parts.slice(1).join(', ') };
  }

  if (/\bat\b/i.test(cleaned)) {
    const parts = cleaned.split(/\bat\b/i).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return { title: parts[0], company: parts.slice(1).join(' at ') };
  }

  return { title: cleaned };
}

function extractExperienceFromSection(lines: string[]): Array<Record<string, unknown>> {
  const entries: Array<Record<string, unknown>> = [];
  const expanded = expandInlineHighlights(lines);
  let current: { title?: string; company?: string; startDate?: string; endDate?: string; highlights?: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    if (!current.title && !current.company && !(current.highlights && current.highlights.length)) {
      current = null;
      return;
    }
    const payload = { ...current } as { highlights?: string[] };
    if (!payload.highlights || payload.highlights.length === 0) {
      delete payload.highlights;
    }
    entries.push(payload);
    current = null;
  };

  for (const raw of expanded) {
    const line = raw.trim();
    if (!line) continue;
    if (detectHeading(line) === 'experience') continue;

    const range = parseDateRange(line);
    if (current && range && isMostlyDateLine(line)) {
      current.startDate = formatDateFromDate(range.start) ?? current.startDate;
      current.endDate = formatDateFromDate(range.end) ?? current.endDate;
      continue;
    }

    if (/^[-•\u2022]/.test(line)) {
      if (current) {
        const highlight = line.replace(/^[-•\u2022]+/, '').trim();
        if (highlight) {
          current.highlights = current.highlights ?? [];
          current.highlights.push(highlight);
        }
      }
      continue;
    }

    if (ACTION_VERB_RX.test(line) && current) {
      current.highlights = current.highlights ?? [];
      current.highlights.push(line);
      continue;
    }

    if (isExperienceStartLine(line)) {
      flush();
      const parsed = parseTitleCompany(line);
      const inlineRange = parseDateRange(line);
      current = {
        ...(parsed.title ? { title: parsed.title } : {}),
        ...(parsed.company ? { company: parsed.company } : {}),
        ...(inlineRange?.start ? { startDate: formatDateFromDate(inlineRange.start) } : {}),
        ...(inlineRange?.end ? { endDate: formatDateFromDate(inlineRange.end) } : {}),
      };
      continue;
    }

    if (current && !current.company && line.length <= 80) {
      current.company = line;
      continue;
    }
    if (current && !current.title && line.length <= 80) {
      current.title = line;
      continue;
    }
  }

  flush();
  return entries;
}

function extractProjectsFromSection(lines: string[]): Array<Record<string, unknown>> {
  const entries: Array<Record<string, unknown>> = [];
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw) continue;
    const cleaned = raw.replace(/^[-•\u2022]+/, '').trim();
    if (!cleaned || /^(projects|project)$/i.test(cleaned)) continue;

    const links = extractLinksFromLine(cleaned);
    const parts = cleaned.split(/\s+-\s+/).map((p) => p.trim()).filter(Boolean);
    let name = parts.shift() ?? '';
    let description = parts.length ? parts.join(' - ') : null;

    if (links.length) {
      for (const link of links) {
        name = name.replace(link, '').trim();
      }
      name = name.replace(/^(github|gitlab|website|portfolio|project)\s*[:\-]?\s*/i, '').trim();
    }

    for (let j = i + 1; j < Math.min(lines.length, i + 3); j += 1) {
      const near = lines[j].trim();
      if (!near) continue;
      if (detectHeading(near)) break;
      const nearLinks = extractLinksFromLine(near);
      if (nearLinks.length) links.push(...nearLinks);
      if (!description && (ACTION_VERB_RX.test(near) || near.length > 20) && !/^[-•\u2022]/.test(near)) {
        description = near;
      } else if (!description && /^[-•\u2022]/.test(near)) {
        description = near.replace(/^[-•\u2022]+/, '').trim();
      }
    }

    if (!name && links.length) name = links[0].replace(/^https?:\/\//i, '');
    if (!name && !description && links.length === 0) continue;

    entries.push({
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
      ...(links.length ? { links: uniqStrings(links) } : {}),
    });
  }
  return entries;
}

function extractCertificationsFromSection(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const trimmed = raw.replace(/^[-•\u2022]+/, '').trim();
    if (!trimmed) continue;
    if (/^(certificates?|certifications?)$/i.test(trimmed)) continue;
    if (trimmed.length < 3) continue;
    out.push(trimmed);
  }
  return uniqStrings(out);
}

function extractCertificationsFromText(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const out: string[] = [];
  for (const line of lines) {
    if (line.length < 4 || line.length > 120) continue;
    if (/certificat|certification|certificate|coursera|udemy|edx/i.test(line)) {
      out.push(line.replace(/^[-•\u2022]+/, '').trim());
    }
  }
  return uniqStrings(out);
}

// ============ CONTENT-AWARE EXTRACTION (works with jumbled PDFs) ============

// Known universities/schools patterns
const UNIVERSITY_PATTERNS = [
  /higher institute/i,
  /university/i,
  /université/i,
  /institute of/i,
  /institut/i,
  /faculty of/i,
  /faculté/i,
  /college/i,
  /school of/i,
  /école/i,
  /isims/i, // Specific Tunisian institutions
  /isg/i,
  /isi/i,
  /insat/i,
  /enit/i,
  /esprit/i,
  /polytechnique/i,
  /sup'com/i,
  /tek-up/i,
];

// Known company/organization patterns
const COMPANY_PATTERNS = [
  /intern(ship)?(\s+at)?/i,
  /stagiaire/i,
  /stage/i,
  /developer at/i,
  /engineer at/i,
  /tunisie\s*telecom/i,
  /orange/i,
  /sofrecom/i,
  /vermeg/i,
  /focus/i,
  /cognira/i,
  /wevioo/i,
  /linedata/i,
  /biat/i,
  /attijari/i,
  /amen\s*bank/i,
  /stb/i,
  /bh\s*bank/i,
];

// Project name patterns
const PROJECT_PATTERNS = [
  /\bapp\b/i,
  /\bapplication\b/i,
  /\bplatform\b/i,
  /\bsystem\b/i,
  /\bdashboard\b/i,
  /\bwebsite\b/i,
  /\bportal\b/i,
  /\banalytics\b/i,
  /\bmanagement\b/i,
  /\btracking\b/i,
  /\be-commerce\b/i,
  /\bchatbot\b/i,
  /\bapi\b/i,
];

/**
 * Extract education entries from entire text (not just section)
 * Works with jumbled PDF text by pattern matching
 * IMPROVED: Prefers multi-year date ranges (typical for education)
 */
function extractEducationFromText(text: string): Array<Record<string, unknown>> {
  // Normalize text to split concatenated date+text patterns
  const normalizedText = normalizeCvText(text);
  const lines = normalizedText.split('\n').map(l => l.trim()).filter(Boolean);
  const entries: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const inlineRange = parseDateRange(line);
    const cleanedLine = stripDateTokens(line);
    const candidateLine = cleanedLine || line;
    
    // Skip if line is just a date
    if (parseDateRange(line)) continue;
    
    // Check if line matches university pattern
    if (UNIVERSITY_PATTERNS.some(p => p.test(candidateLine))) {
      let school = candidateLine;
      let degreeFromLine: string | null = null;
      const dashSplit = candidateLine.split(/\s+[\-–—]\s+/).map((p) => p.trim()).filter(Boolean);
      if (dashSplit.length >= 2) {
        const left = dashSplit[0];
        const right = dashSplit.slice(1).join(' - ');
        const rightHasUni = UNIVERSITY_PATTERNS.some((p) => p.test(right));
        const leftHasUni = UNIVERSITY_PATTERNS.some((p) => p.test(left));
        if (rightHasUni && !leftHasUni) {
          school = right;
          degreeFromLine = left;
        } else if (leftHasUni && !rightHasUni) {
          school = left;
          degreeFromLine = right;
        }
      }

      school = school.replace(/\([^)]*\)$/, '').trim(); // Remove trailing parenthetical
      if (seen.has(school.toLowerCase())) continue;
      seen.add(school.toLowerCase());
      
      // Look for degree and dates nearby
      let degree: string | null = null;
      let startDate: string | null = null;
      let endDate: string | null = null;
      let bestDateRange: { start: Date | null; end: Date | null } | null = null;
      let bestDateSpan = 0;
      
      // Search for dates - prefer multi-year ranges (education typically 2-5 years)
      if (inlineRange && inlineRange.start && inlineRange.end) {
        const span = inlineRange.end.getFullYear() - inlineRange.start.getFullYear();
        if (span >= 0 && span <= 10) {
          bestDateRange = inlineRange;
          bestDateSpan = span;
        }
      }
      for (let j = Math.max(0, i - 10); j < Math.min(lines.length, i + 10); j++) {
        const nearLine = lines[j];
        
        // Check for degree keywords
        if (/engineer|engineering|master|bachelor|licence|degree|diploma|bac\+|software/i.test(nearLine) && !degree) {
          // Skip if it's the school line itself or a header
          if (nearLine !== line && !/^(education|experience|skills)$/i.test(nearLine)) {
            degree = nearLine;
          }
        }
        
        // Check for date range
        const dateRange = parseDateRange(nearLine);
        if (dateRange && dateRange.start && dateRange.end) {
          const startYear = dateRange.start.getFullYear();
          const endYear = dateRange.end.getFullYear();
          const span = endYear - startYear;
          
          // Prefer longer spans (education = 2-5 years typically)
          if (span >= 2 && span <= 6 && span > bestDateSpan) {
            bestDateRange = dateRange;
            bestDateSpan = span;
          }
        }
      }
      
      if (!degree && degreeFromLine) degree = degreeFromLine;
      if (bestDateRange) {
        startDate = formatDateFromDate(bestDateRange.start);
        endDate = formatDateFromDate(bestDateRange.end);
      }
      
      entries.push({
        school,
        ...(degree ? { degree } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });
    }
  }
  
  return entries;
}

/**
 * Extract work experience from entire text
 * Looks for intern/job titles with company names and dates
 * IMPROVED: Prefers dates AFTER the job title over dates BEFORE
 */
function extractExperienceFromText(text: string): Array<Record<string, unknown>> {
  // Normalize text to split concatenated date+text patterns
  const normalizedText = normalizeCvText(text);
  const lines = normalizedText.split('\n').map(l => l.trim()).filter(Boolean);
  const entries: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  const usedDateLines = new Set<number>(); // Track which date lines are already used
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const inlineRange = parseDateRange(line);
    const cleanedLine = stripDateTokens(line);
    const candidateLine = cleanedLine || line;
    
    // Skip if line is just a date (will be associated with nearby entry)
    if (inlineRange && isMostlyDateLine(line)) continue;
    
    // Check for job title patterns (intern, developer, engineer, etc.)
    const titleMatch = candidateLine.match(/\b(web\s*developer|software\s*engineer|developer|engineer|intern|stagiaire|stage)\b[,\s]*([\w\s]+)?/i);
    
    if (titleMatch || COMPANY_PATTERNS.some(p => p.test(candidateLine))) {
      // Extract title and company from the line
      let title: string | null = null;
      let company: string | null = null;
      
      // Try to parse "Title - Company", "Title, Company", or "Title at Company" formats
      const dashParts = candidateLine.split(/\s+[\-–—]\s+/).map((p) => p.trim()).filter(Boolean);
      if (dashParts.length >= 2) {
        title = dashParts[0];
        company = dashParts.slice(1).join(' - ');
      } else if (candidateLine.includes(',')) {
        const parts = candidateLine.split(',').map(p => p.trim());
        title = parts[0];
        company = parts[1];
      } else if (/\bat\b/i.test(candidateLine)) {
        const parts = candidateLine.split(/\bat\b/i).map(p => p.trim());
        title = parts[0];
        company = parts[1];
      } else {
        title = candidateLine;
      }
      
      // Skip if we've seen this exact entry
      const key = `${title}-${company}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      
      // Look for dates - PREFER dates AFTER the title (within 3 lines)
      let startDate: string | null = null;
      let endDate: string | null = null;
      const highlights: string[] = [];

      const assignFromRange = (range: { start: Date | null; end: Date | null }) => {
        if (!startDate && range.start) startDate = formatDateFromDate(range.start);
        if (!endDate && range.end) endDate = formatDateFromDate(range.end);
      };

      if (inlineRange && !isMostlyDateLine(line)) {
        assignFromRange(inlineRange);
      }
      
      // First, look AFTER the title (more reliable for jumbled PDFs)
      if (!startDate || !endDate) {
        for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
          const nearLine = lines[j];
          const dateRange = parseDateRange(nearLine);
          if (dateRange && !usedDateLines.has(j)) {
            assignFromRange(dateRange);
            usedDateLines.add(j);
            if (startDate && endDate) break;
          }
        }
      }
      
      // If no date found after, look BEFORE (but only if it's an internship-length date)
      if (!startDate || !endDate) {
        for (let j = Math.max(0, i - 2); j < i; j++) {
          const nearLine = lines[j];
          const dateRange = parseDateRange(nearLine);
          if (dateRange && !usedDateLines.has(j)) {
            // Only use if it looks like a short-term date (internship = < 6 months typically)
            const startD = dateRange.start;
            const endD = dateRange.end;
            // Skip multi-year ranges (likely education dates)
            const startYear = startD?.toString().match(/\d{4}/)?.[0];
            const endYear = endD?.toString().match(/\d{4}/)?.[0];
            if (startYear && endYear && Math.abs(parseInt(endYear) - parseInt(startYear)) <= 1) {
              assignFromRange(dateRange);
              usedDateLines.add(j);
              if (startDate && endDate) break;
            }
          }
        }
      }
      
      // Collect highlights (bullet points describing work done)
      for (let j = i + 1; j < Math.min(lines.length, i + 10); j++) {
        const nearLine = lines[j];
        // Stop if we hit another job title or section header
        if (/\b(intern|developer|engineer|EDUCATION|EXPERIENCE|PROJECTS|SKILLS)\b/i.test(nearLine)) {
          break;
        }
        if (/^[-•\u2022]|^(built|created|developed|designed|implemented|managed|used|applied)/i.test(nearLine)) {
          const highlight = nearLine.replace(/^[-•\u2022]+\s*/, '').trim();
          if (highlight.length > 10 && highlight.length < 200) {
            highlights.push(highlight);
          }
        }
      }
      
      // Only add if we have meaningful data
      if (title && title.length > 3) {
        entries.push({
          title,
          ...(company ? { company } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
          ...(highlights.length ? { highlights } : {}),
        });
      }
    }
  }
  
  return entries;
}

/**
 * Extract projects from entire text
 * Looks for project name patterns
 */
function extractProjectsFromText(text: string): Array<Record<string, unknown>> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const entries: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip very short or very long lines
    if (line.length < 5 || line.length > 100) continue;
    
    // Check if line looks like a project name
    if (PROJECT_PATTERNS.some(p => p.test(line))) {
      const name = line.replace(/^[-•\u2022]+\s*/, '').trim();
      
      // Skip if it's a section header
      if (/^(projects|education|experience|skills|languages)$/i.test(name)) continue;
      
      // Skip duplicates
      if (seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      
      // Look for description and technologies nearby
      let description: string | null = null;
      const links: string[] = [];
      const technologies: string[] = [];
      
      links.push(...extractLinksFromLine(line));

      for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
        const nearLine = lines[j];
        
        // Check for description
        if (!description && nearLine.length > 20 && /analysis|built|created|developed|using/i.test(nearLine)) {
          description = nearLine;
        }
        
        // Extract technologies mentioned
        const techs = extractTechnologiesFromText(nearLine);
        technologies.push(...techs);

        const nearLinks = extractLinksFromLine(nearLine);
        if (nearLinks.length) links.push(...nearLinks);
      }
      
      entries.push({
        name,
        ...(description ? { description } : {}),
        ...(technologies.length ? { technologies: [...new Set(technologies)] } : {}),
        ...(links.length ? { links: uniqStrings(links) } : {}),
      });
    }
  }
  
  return entries;
}

function parseResumeHeuristic(text: string): Record<string, unknown> {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const sections = splitSections(lines);
  const contact = extractContactFromText(lines);
  const summaryFromSection = sections.profile ? extractSummaryFromSection(sections.profile) : null;
  const summary = summaryFromSection || inferSummaryFromLines(lines, contact);
  
  // Enhanced skill extraction - combine multiple methods
  const sectionSkills = sections.skills ? extractSkillsFromSection(sections.skills) : [];
  const dashSkills = extractDashSeparatedSkills(text);
  const parenSkills = extractSkillsWithParentheses(text);
  const techSkills = extractTechnologiesFromText(text);
  const allSkills = uniqStrings([...sectionSkills, ...dashSkills, ...parenSkills, ...techSkills]);
  
  // Enhanced language extraction
  const sectionLanguages = sections.languages ? extractLanguagesFromSection(sections.languages) : [];
  const spokenLanguages = extractSpokenLanguages(text);
  const languageNames = spokenLanguages.map(l => `${l.name} (${l.level})`);
  const allLanguages = normalizeLanguageList([...sectionLanguages, ...languageNames]);

  const sectionCerts = sections.certificates ? extractCertificationsFromSection(sections.certificates) : [];
  const textCerts = extractCertificationsFromText(text);
  const allCerts = uniqStrings([...sectionCerts, ...textCerts]);
  
  // Education: try section-based first, fall back to content-aware
  let education = sections.education ? extractEducationFromSection(sections.education) : [];
  if (education.length === 0) {
    education = extractEducationFromText(text);
  }
  
  // Experience: try section-based first, fall back to content-aware  
  let experience = sections.experience ? extractExperienceFromSection(sections.experience) : [];
  if (experience.length === 0) {
    experience = extractExperienceFromText(text);
  }
  
  // Projects: try section-based first, fall back to content-aware
  let projects = sections.projects ? extractProjectsFromSection(sections.projects) : [];
  if (projects.length === 0) {
    projects = extractProjectsFromText(text);
  }

  return {
    contact,
    ...(summary ? { summary } : {}),
    ...(allSkills.length ? { skills: allSkills } : {}),
    ...(allLanguages.length ? { languages: allLanguages } : {}),
    ...(spokenLanguages.length ? { spokenLanguages } : {}),
    ...(education.length ? { education } : {}),
    ...(experience.length ? { experience } : {}),
    ...(projects.length ? { projects } : {}),
    ...(allCerts.length ? { certifications: allCerts } : {}),
  };
}

function mergeParsedData(primary: Record<string, unknown>, fallback: Record<string, unknown>): Record<string, unknown> {
  const primaryContact = (primary.contact && typeof primary.contact === 'object' ? primary.contact : {}) as Record<string, unknown>;
  const fallbackContact = (fallback.contact && typeof fallback.contact === 'object' ? fallback.contact : {}) as Record<string, unknown>;

  const mergedContact: Record<string, unknown> = { ...fallbackContact };
  for (const [key, value] of Object.entries(primaryContact)) {
    if (typeof value === 'string' && value.trim()) {
      if (key === 'location') {
        const fallbackValue = typeof mergedContact.location === 'string' ? mergedContact.location : '';
        if (isLikelyLocationValue(value) || !fallbackValue) mergedContact[key] = value.trim();
        continue;
      }
      mergedContact[key] = value.trim();
    }
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

  // Merge experience arrays - fill in missing dates from fallback
  const expPrimary = Array.isArray(primary.experience) ? primary.experience : [];
  const expFallback = Array.isArray(fallback.experience) ? fallback.experience : [];
  if (expPrimary.length === 0 && expFallback.length > 0) {
    out.experience = expFallback;
  } else if (expPrimary.length > 0 && expFallback.length > 0) {
    // Merge: for each primary entry, try to find matching fallback with dates
    out.experience = expPrimary.map((exp: any) => {
      const hasStartDate = exp.startDate && typeof exp.startDate === 'string' && exp.startDate.trim();
      const hasEndDate = exp.endDate && typeof exp.endDate === 'string' && exp.endDate.trim();
      
      if (!hasStartDate || !hasEndDate) {
        // Try to find matching fallback entry with dates
        const expTitle = (exp.title || '').toLowerCase();
        const expCompany = (exp.company || '').toLowerCase();
        const match = expFallback.find((fb: any) => {
          const fbTitle = (fb.title || '').toLowerCase();
          const fbCompany = (fb.company || '').toLowerCase();
          // Match by title similarity or company similarity
          return (fbTitle && expTitle.includes(fbTitle.split(' ')[0])) ||
                 (expTitle && fbTitle.includes(expTitle.split(' ')[0])) ||
                 (fbCompany && expCompany.includes(fbCompany)) ||
                 (expCompany && fbCompany.includes(expCompany));
        });
        
        if (match) {
          return {
            ...exp,
            ...(!hasStartDate && match.startDate ? { startDate: match.startDate } : {}),
            ...(!hasEndDate && match.endDate ? { endDate: match.endDate } : {}),
            // Also merge highlights if missing
            ...((!exp.highlights || exp.highlights.length === 0) && match.highlights ? 
                { highlights: match.highlights } : {}),
          };
        }
      }
      return exp;
    });
  }

  // Merge education arrays - fill in missing dates from fallback
  const eduPrimary = Array.isArray(primary.education) ? primary.education : [];
  const eduFallback = Array.isArray(fallback.education) ? fallback.education : [];
  if (eduPrimary.length === 0 && eduFallback.length > 0) {
    out.education = eduFallback;
  } else if (eduPrimary.length > 0 && eduFallback.length > 0) {
    out.education = eduPrimary.map((edu: any) => {
      const hasStartDate = edu.startDate && typeof edu.startDate === 'string' && edu.startDate.trim();
      const hasEndDate = edu.endDate && typeof edu.endDate === 'string' && edu.endDate.trim();
      
      if (!hasStartDate || !hasEndDate) {
        const eduSchool = (edu.school || edu.institution || '').toLowerCase();
        const match = eduFallback.find((fb: any) => {
          const fbSchool = (fb.school || fb.institution || '').toLowerCase();
          return (eduSchool && fbSchool && (eduSchool.includes(fbSchool) || fbSchool.includes(eduSchool)));
        });
        
        if (match) {
          return {
            ...edu,
            ...(!hasStartDate && match.startDate ? { startDate: match.startDate } : {}),
            ...(!hasEndDate && match.endDate ? { endDate: match.endDate } : {}),
          };
        }
      }
      return edu;
    });
  }

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

function sanitizeFullName(name: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.includes('native') || lower.includes('fluent') || lower.includes('conversational')) return null;
  if (trimmed.includes('|')) return null;
  if (KNOWN_LANGUAGES.has(lower)) return null;
  if (/:/.test(trimmed) && KNOWN_LANGUAGES.has(lower.split(':')[0]?.trim() ?? '')) return null;
  return trimmed;
}

function splitDateRangeText(input: unknown): { start: string; end: string } | null {
  const normalized = normalizeDateText(input);
  if (!normalized) return null;

  const tokens = extractDateTokens(normalized);
  if (tokens.length < 2) return null;

  const presentIndex = tokens.findIndex(isPresentToken);
  const endToken = presentIndex >= 0 ? tokens[presentIndex] : tokens[tokens.length - 1];
  const startToken = tokens.find((t, idx) => idx !== presentIndex && !isPresentToken(t)) ?? tokens[0];

  if (!startToken || !endToken) return null;
  return { start: startToken, end: endToken };
}

function isLikelySkillToken(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const normalized = normalizeSkillKey(trimmed);
  const lower = normalized.toLowerCase();
  const compact = lower.replace(/\s+/g, '');
  if (MONTH_WORDS.has(lower)) return false;
  if (LANGUAGE_LEVELS.has(lower)) return false;
  if (KNOWN_LANGUAGES.has(lower)) return false;
  if (TUNISIAN_CITIES.has(lower)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (/^\d{4}$/.test(lower)) return false;
  if (SKILL_STOPWORDS.has(lower)) return false;
  if (SKILL_REJECT_RX.test(lower)) return false;

  if (KNOWN_TECHNOLOGIES.has(lower)) return true;
  if (KNOWN_TECHNOLOGIES.has(compact)) return true;
  if (/[+#./]/.test(trimmed)) return true;
  if (/^[A-Z]{2,6}$/.test(trimmed)) return false;
  if (/(js|ts|sql|db|api|ai|ml|nlp|rag)$/.test(lower)) return true;
  if (/\s/.test(trimmed)) return false;
  if (/\d/.test(trimmed)) return true;
  return false;
}

function filterSkillNoise(items: string[]): string[] {
  return items.filter(isLikelySkillToken);
}

function normalizeLanguageList(items: string[]): string[] {
  const cleaned = uniqStrings(items);
  const bestByBase = new Map<string, string>();
  for (const raw of cleaned) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const base = trimmed.replace(/\s*\(.*\)\s*$/, '').toLowerCase();
    const existing = bestByBase.get(base);
    if (!existing) {
      bestByBase.set(base, trimmed);
      continue;
    }
    const existingHasLevel = /\(.*\)/.test(existing);
    const currentHasLevel = /\(.*\)/.test(trimmed);
    if (!existingHasLevel && currentHasLevel) {
      bestByBase.set(base, trimmed);
    }
  }
  return Array.from(bestByBase.values());
}

function isPresentToken(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return ['present', 'current', 'now', 'today'].includes(lower);
}

function createDateTokenRegex(): RegExp {
  return /\b(?:present|current|now|today)\b|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{4}\b|\b\d{4}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|\b\d{4}[\/-]\d{1,2}\b|\b\d{1,2}[\/-]\d{4}\b|\b\d{4}\s*[\-–—]\s*\d{4}\b|\b\d{4}\b/gi;
}

function extractDateTokens(text: string): string[] {
  const raw = String(text ?? '').trim();
  if (!raw) return [];
  const tokens: string[] = [];
  const rx = createDateTokenRegex();
  let match: RegExpExecArray | null;

  while ((match = rx.exec(raw)) !== null) {
    const value = match[0].trim();
    if (!value) continue;
    if (/^\d{4}\s*[\-–—]\s*\d{4}$/.test(value)) {
      const parts = value.split(/[\-–—]/).map((p) => p.trim()).filter(Boolean);
      tokens.push(...parts);
      continue;
    }
    tokens.push(value);
  }

  return tokens;
}

function stripDateTokens(text: string): string {
  const raw = String(text ?? '');
  if (!raw) return '';
  const rx = createDateTokenRegex();
  return raw.replace(rx, ' ').replace(/\s+/g, ' ').trim();
}

function isMostlyDateLine(line: string): boolean {
  const trimmed = String(line ?? '').trim();
  if (!trimmed) return false;
  const tokens = extractDateTokens(trimmed);
  if (tokens.length < 2) return false;
  const remainder = stripDateTokens(trimmed).replace(/[|,;.:\-–—]/g, '').trim();
  return remainder.length <= 4;
}

function normalizeDateText(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let out = input.trim();
  if (!out) return null;

  out = out.replace(/[–—]/g, '-');
  out = out.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [rx, replacement] of MONTH_MAP) out = out.replace(rx, replacement);

  out = out.replace(/\bactuellement\b|\ben cours\b/gi, 'Present');
  out = out.replace(/[\s-]+$/, '').trim();
  out = out.replace(/^[\s-]+$/, '').trim();

  return out || null;
}

function normalizeDatePair(startInput: unknown, endInput: unknown): { startDate?: string; endDate?: string } {
  let startDate = normalizeDateText(startInput);
  let endDate = normalizeDateText(endInput);

  const rangeFromStart = splitDateRangeText(startDate);
  const rangeFromEnd = splitDateRangeText(endDate);
  if (rangeFromStart) {
    startDate = rangeFromStart.start;
    endDate = rangeFromStart.end;
  } else if (rangeFromEnd) {
    startDate = rangeFromEnd.start;
    endDate = rangeFromEnd.end;
  }

  const startParsed = parseLooseDate(startDate);
  const endParsed = parseLooseDate(endDate);
  if (startParsed && endParsed && endParsed.getTime() < startParsed.getTime()) {
    const tmp = startDate;
    startDate = endDate;
    endDate = tmp;
  }

  return {
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };
}

function buildFallbackSummary(
  contact: ResumeContact,
  experience: Array<Record<string, unknown>>,
  skills: string[]
): string | null {
  const first = experience[0] ?? {};
  const title = asTrimmedString((first as any).title);
  const company = asTrimmedString((first as any).company);
  const topSkills = skills.slice(0, 4).join(', ');

  if (title && topSkills) return `${title} with experience in ${topSkills}.`;
  if (title && company) return `${title} at ${company}.`;
  if (title) return `${title} with hands-on project experience.`;
  if (topSkills) return `Candidate with skills in ${topSkills}.`;
  if (contact.fullName) return `Candidate profile for ${contact.fullName}.`;
  return null;
}

function normalizeParsedData(parsed: Record<string, unknown>): Record<string, unknown> {
  const contactRaw = (parsed.contact && typeof parsed.contact === 'object' ? parsed.contact : {}) as Record<string, unknown>;

  const links = uniqStrings(asStringArray(contactRaw.links));
  const derivedLinkedin = links.find(l => l.toLowerCase().includes('linkedin.com'));
  const derivedPortfolio = pickPortfolioLink(links);

  const contact = {
    fullName: sanitizeFullName(asTrimmedString(contactRaw.fullName)),
    email: asTrimmedString(contactRaw.email),
    phone: asTrimmedString(contactRaw.phone),
    location: asTrimmedString(contactRaw.location),
    linkedin: asTrimmedString((contactRaw as any).linkedin) || derivedLinkedin,
    portfolio: asTrimmedString((contactRaw as any).portfolio) || derivedPortfolio,
    links,
  };

  const skills = filterSkillNoise(uniqStrings(asStringArray(parsed.skills)));

  const experienceRaw = Array.isArray(parsed.experience) ? parsed.experience : [];
  let experience = experienceRaw
    .map((row: any) => {
      const company = asTrimmedString(row?.company);
      const title = asTrimmedString(row?.title);
      const datePair = normalizeDatePair(row?.startDate, row?.endDate);
      const startDate = datePair.startDate;
      const endDate = datePair.endDate;
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

  experience = experience.map((row: any) => {
    if (row.company && typeof row.company === 'string' && row.company.includes(' - ')) {
      const parts = row.company.split(/\s+-\s+/).map((p: string) => p.trim()).filter(Boolean);
      const head = parts.shift();
      const tail = parts.filter((p: string) => ACTION_VERB_RX.test(p));
      if (head && tail.length) {
        const mergedHighlights = uniqStrings([...(row.highlights ?? []), ...tail]);
        return { ...row, company: head, highlights: mergedHighlights };
      }
    }
    return row;
  });

  const educationRaw = Array.isArray(parsed.education) ? parsed.education : [];
  let education = educationRaw
    .map((row: any) => {
      const school = asTrimmedString(row?.school);
      const degree = asTrimmedString(row?.degree);
      const datePair = normalizeDatePair(row?.startDate, row?.endDate);
      const startDate = datePair.startDate;
      const endDate = datePair.endDate;
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
      let name = asTrimmedString(row?.name);
      const description = asTrimmedString(row?.description);
      const linkCandidates = uniqStrings([
        ...asStringArray(row?.links),
        ...(name ? extractLinksFromLine(name) : []),
      ]);
      const links = uniqStrings(linkCandidates);
      if (name && links.length) {
        for (const link of links) {
          name = name.replace(link, '').trim();
        }
      }
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
  const languages = normalizeLanguageList(uniqStrings(asStringArray(parsed.languages)));

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
  const highlightCompetencies = experience
    .flatMap((row: any) => asStringArray(row?.highlights))
    .filter((text) => text.length >= 12 && (VERB_START.test(text) || text.split(' ').length >= 5));
  const competencies = uniqStrings([...autoCompetencies, ...parsedCompetencies, ...highlightCompetencies]);
  let summaryText = summary;
  if (!summaryText) {
    summaryText = buildFallbackSummary(contact, experience, pureSkills);
  }

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
      if (token && isLikelySkillToken(token) && !skillLower.has(token.toLowerCase())) {
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
    ...(summaryText ? { summary: summaryText } : {}),
    certifications,
    ...(languages.length ? { languages } : {}),
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
  const raw = typeof input === 'string' ? input : String(input ?? '');
  if (!raw.trim()) return null;

  const tokens = extractDateTokens(raw);
  if (tokens.length < 2) return null;

  const presentIndex = tokens.findIndex(isPresentToken);
  const endToken = presentIndex >= 0 ? tokens[presentIndex] : tokens[tokens.length - 1];
  const startToken = tokens.find((t, idx) => idx !== presentIndex && !isPresentToken(t)) ?? tokens[0];

  const start = parseLooseDate(startToken);
  const end = parseLooseDate(endToken);
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

function calculateCompletenessScore(
  parsed: Record<string, unknown>,
  contact: ResumeContact,
  pointsConfig: CompletenessPointsConfig,
  candidateMeta?: { linkedin?: string; portfolio?: string }
): number {
  let points = 0;
  const maxPoints = Object.values(pointsConfig).reduce((sum, val) => sum + val, 0);
  if (!Number.isFinite(maxPoints) || maxPoints <= 0) return 0;

  const hasLinks = Array.isArray(contact.links) && contact.links.length > 0;
  const competencies = asStringArray(parsed.competencies);
  const experience = Array.isArray(parsed.experience) ? parsed.experience : [];
  const education = Array.isArray(parsed.education) ? parsed.education : [];
  const hasExperienceDates = experience.some((row: any) =>
    normalizeDateText(row?.startDate) && normalizeDateText(row?.endDate)
  );

  if (contact.fullName) points += pointsConfig.fullName;
  if (contact.email) points += pointsConfig.email;
  if (contact.phone) points += pointsConfig.phone;
  if (contact.location) points += pointsConfig.location;
  if (hasLinks) points += pointsConfig.links;

  if (contact.linkedin || candidateMeta?.linkedin) points += pointsConfig.linkedin;
  if (contact.portfolio || candidateMeta?.portfolio) points += pointsConfig.portfolio;

  if (asTrimmedString(parsed.summary)) points += pointsConfig.summary;
  if (competencies.length > 0) points += pointsConfig.competencies;

  if (experience.length > 0) points += pointsConfig.experience;
  if (hasExperienceDates) points += pointsConfig.experienceDates;

  if (education.length > 0) points += pointsConfig.education;

  return clampPercent((points / maxPoints) * 100);
}

function computeMissingFields(parsed: Record<string, unknown>, contact: ResumeContact, candidateMeta?: { linkedin?: string; portfolio?: string }): string[] {
  const missing: string[] = [];
  const links = Array.isArray(contact.links) ? contact.links : [];
  const competencies = asStringArray(parsed.competencies);
  const skills = asStringArray(parsed.skills);
  const experience = Array.isArray(parsed.experience) ? parsed.experience : [];
  const education = Array.isArray(parsed.education) ? parsed.education : [];
  const projects = Array.isArray(parsed.projects) ? parsed.projects : [];

  if (!contact.fullName) missing.push('fullName');
  if (!contact.email) missing.push('email');
  if (!contact.phone) missing.push('phone');
  if (!contact.location) missing.push('location');
  if (links.length === 0) missing.push('links');
  if (!contact.linkedin && !candidateMeta?.linkedin) missing.push('linkedin');
  if (!contact.portfolio && !candidateMeta?.portfolio) missing.push('portfolio');
  if (!asTrimmedString(parsed.summary)) missing.push('summary');
  if (competencies.length === 0) missing.push('competencies');
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
    links: 0.5,
    linkedin: 0.5,
    portfolio: 0.5,
    summary: 1,
    competencies: 1,
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

// Project complexity indicators - for scoring depth of work
const COMPLEXITY_INDICATORS: Record<string, string[]> = {
  authentication: ['oauth', 'jwt', '2fa', 'totp', 'sso', 'auth', 'login', 'authentication', 'authorization'],
  realtime: ['socket', 'websocket', 'real-time', 'realtime', 'live', 'streaming', 'push notification'],
  payments: ['stripe', 'payment', 'billing', 'subscription', 'checkout', 'paypal', 'e-commerce'],
  analytics: ['dashboard', 'analytics', 'visualization', 'kibana', 'grafana', 'metrics', 'reporting'],
  deployment: ['nginx', 'docker', 'ci/cd', 'aws', 'deploy', 'kubernetes', 'cloud', 'devops'],
  database: ['migration', 'orm', 'prisma', 'sequelize', 'typeorm', 'database design', 'schema'],
  optimization: ['caching', 'swr', 'performance', 'seo', 'optimization', 'lazy loading', 'code splitting'],
  api: ['rest api', 'graphql', 'api design', 'microservices', 'api integration'],
  testing: ['unit test', 'integration test', 'e2e', 'tdd', 'jest', 'cypress', 'testing'],
  architecture: ['clean architecture', 'mvc', 'mvvm', 'design pattern', 'solid', 'ddd'],
};

function calculateProjectComplexityScore(parsed: Record<string, unknown>): number {
  const experience = Array.isArray(parsed.experience) ? parsed.experience : [];
  const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
  const competencies = asStringArray(parsed.competencies);
  
  // Gather all text to search
  const allText: string[] = [];
  for (const exp of experience as any[]) {
    if (exp?.title) allText.push(exp.title);
    if (exp?.company) allText.push(exp.company);
    for (const h of asStringArray(exp?.highlights)) allText.push(h);
  }
  for (const proj of projects as any[]) {
    if (proj?.name) allText.push(proj.name);
    if (proj?.description) allText.push(proj.description);
  }
  allText.push(...competencies);
  
  const combinedText = allText.join(' ').toLowerCase();
  
  let score = 0;
  const foundCategories: string[] = [];
  
  for (const [category, keywords] of Object.entries(COMPLEXITY_INDICATORS)) {
    for (const keyword of keywords) {
      if (combinedText.includes(keyword)) {
        if (!foundCategories.includes(category)) {
          foundCategories.push(category);
          score += 10; // +10 points per complexity category demonstrated
        }
        break;
      }
    }
  }
  
  // Bonus for multiple complexity indicators
  if (foundCategories.length >= 5) score += 15;
  else if (foundCategories.length >= 3) score += 10;
  
  return Math.min(100, score);
}

function matchesCriterionKeyword(keyword: string, evidence: { textNormalized: string; textCompact: string }): boolean {
  const normalized = normalizeSkillKey(keyword);
  if (!normalized) return false;
  const compact = compactSkillKey(keyword);
  if (normalized.includes(' ')) {
    return evidence.textNormalized.includes(normalized);
  }
  return evidence.textCompact.includes(compact);
}

function applyCustomCriteria(
  criteria: CustomCriterion[],
  evidence: { textNormalized: string; textCompact: string }
): number {
  let delta = 0;
  for (const criterion of criteria) {
    if (!criterion || !Array.isArray(criterion.keywords) || criterion.keywords.length === 0) continue;
    const checks = criterion.keywords.map((kw) => matchesCriterionKeyword(kw, evidence));
    const matched = criterion.requireAll ? checks.every(Boolean) : checks.some(Boolean);
    if (!matched) continue;
    delta += criterion.type === 'penalty' ? -criterion.points : criterion.points;
  }
  return delta;
}

// Check if skills are from the same ecosystem
function checkEcosystemMatch(requiredSkill: string, candidateSkills: string[]): boolean {
  const reqLower = requiredSkill.toLowerCase();
  const candidateLower = candidateSkills.map(s => s.toLowerCase());
  
  for (const [ecosystem, members] of Object.entries(SKILL_ECOSYSTEM_GROUPS)) {
    const reqInEcosystem = members.some(m => reqLower.includes(m) || m.includes(reqLower));
    if (reqInEcosystem) {
      const hasEcosystemSkill = candidateLower.some(cs => 
        members.some(m => cs.includes(m) || m.includes(cs))
      );
      if (hasEcosystemSkill) return true;
    }
  }
  return false;
}

export function deterministicEvaluate(
  requirements: Requirements | unknown,
  parsed: Record<string, unknown>,
  candidateMeta?: { linkedin?: string; portfolio?: string }
): EvaluationResult {
  const requirementsObj = (requirements && typeof requirements === 'object' ? requirements : {}) as Record<string, unknown>;
  const evaluationConfig = mergeEvaluationConfig((requirementsObj as any).evaluationConfig);
  const requiredSkills = asStringArray((requirementsObj as any).skillsRequired);
  const niceToHaveSkills = asStringArray((requirementsObj as any).skillsNiceToHave);

  const evidence = buildEvidence(parsed);
  const candidateSkills = asStringArray(parsed.skills);
  const skillsMatchedBase = requiredSkills.filter((skill) => hasSkillMatch(skill, evidence));
  const skillsMissingBase = requiredSkills.filter((skill) => !hasSkillMatch(skill, evidence));
  const niceToHaveMatched = niceToHaveSkills.filter((skill) => hasSkillMatch(skill, evidence));
  
  // Check for ecosystem matches on missing skills (partial credit)
  // Increased from 30% to 60% - if you know Next.js, you likely know React well
  const ecosystemMatches = skillsMissingBase.filter(skill => checkEcosystemMatch(skill, candidateSkills));
  const ecosystemBonus = ecosystemMatches.length * 0.6; // 60% credit for ecosystem match

  const skillsMatched = uniqStrings([...skillsMatchedBase, ...ecosystemMatches]);
  const matchedSet = new Set(skillsMatched.map((skill) => skill.toLowerCase()));
  const skillsMissing = requiredSkills.filter((skill) => !matchedSet.has(skill.toLowerCase()));

  const requiredCoverage = requiredSkills.length > 0
    ? ((skillsMatchedBase.length + ecosystemBonus) / requiredSkills.length) * 100
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
    
  // Calculate project complexity score
  const complexityScore = calculateProjectComplexityScore(parsed);

  // Fit score uses configurable weights (normalized to 100%).
  // Complexity is blended into the experience component so it stays configurable.
  const fitWeightTotal = evaluationConfig.requiredSkillsWeight
    + evaluationConfig.niceToHaveSkillsWeight
    + evaluationConfig.experienceWeight;
  const reqWeight = fitWeightTotal > 0 ? evaluationConfig.requiredSkillsWeight / fitWeightTotal : 1 / 3;
  const niceWeight = fitWeightTotal > 0 ? evaluationConfig.niceToHaveSkillsWeight / fitWeightTotal : 1 / 3;
  const expWeight = fitWeightTotal > 0 ? evaluationConfig.experienceWeight / fitWeightTotal : 1 / 3;
  const experienceComposite = (experienceScore * 0.7) + (complexityScore * 0.3);
  const fitScore = (requiredCoverage * reqWeight)
    + (niceToHaveCoverage * niceWeight)
    + (experienceComposite * expWeight);

  const contact = buildContact(parsed);
  const completenessScore = calculateCompletenessScore(
    parsed,
    {
      ...contact,
      linkedin: contact.linkedin ?? candidateMeta?.linkedin,
      portfolio: contact.portfolio ?? candidateMeta?.portfolio,
    },
    evaluationConfig.completenessPoints,
    candidateMeta
  );

  const mainWeightTotal = evaluationConfig.fitWeight + evaluationConfig.completenessWeight;
  const fitWeight = mainWeightTotal > 0 ? evaluationConfig.fitWeight / mainWeightTotal : 0.5;
  const completenessWeight = mainWeightTotal > 0 ? evaluationConfig.completenessWeight / mainWeightTotal : 0.5;

  let score = (fitScore * fitWeight) + (completenessScore * completenessWeight);
  score += applyCustomCriteria(evaluationConfig.customCriteria, evidence);
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

  const qt = evaluationConfig.qualityThresholds;
  const excellent = Math.max(qt.excellent, qt.good, qt.fair);
  const good = Math.min(Math.max(qt.good, qt.fair), excellent);
  const fair = Math.min(qt.fair, good);
  score = clampPercent(score);

  const qualityLabelValue: 'excellent' | 'good' | 'fair' | 'poor' = score >= excellent
    ? 'excellent'
    : score >= good
      ? 'good'
      : score >= fair
        ? 'fair'
        : 'poor';
  let qualityLabel: 'excellent' | 'good' | 'fair' | 'poor' = qualityLabelValue;
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

  // Ensure experience is always an array
  const experienceRaw = Array.isArray(content.experience) ? content.experience : [];
  const experience = experienceRaw.map((row) => ({
    ...row,
    ...(normalizeStart(row?.startDate, row?.endDate) ? { startDate: normalizeStart(row?.startDate, row?.endDate) } : {}),
    ...(normalizeEnd(row?.endDate) ? { endDate: normalizeEnd(row?.endDate) } : {}),
  }));

  // Ensure education is always an array (or undefined if empty)
  const educationRaw = Array.isArray(content.education) ? content.education : [];
  const education = educationRaw.length > 0
    ? educationRaw.map((row) => ({
        ...row,
        ...(normalizeDateText(row?.startDate) ? { startDate: normalizeDateText(row?.startDate) as string } : {}),
        ...(normalizeDateText(row?.endDate) ? { endDate: normalizeDateText(row?.endDate) as string } : {}),
      }))
    : undefined;

  // Ensure projects is always an array
  const projectsRaw = Array.isArray(content.projects) ? content.projects : [];
  const projects = projectsRaw.length > 0 ? projectsRaw : undefined;

  return {
    ...content,
    skills: uniqStrings(asStringArray(content.skills)),
    experience,
    ...(education ? { education } : {}),
    ...(projects ? { projects } : {}),
    // Ensure other array fields are safe
    certifications: uniqStrings(asStringArray(content.certifications)),
    languages: uniqStrings(asStringArray(content.languages)),
    qualities: uniqStrings(asStringArray(content.qualities)),
    interests: uniqStrings(asStringArray(content.interests)),
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
    const parseTimeoutMs = Number(process.env.CANDIDATE_AI_PARSE_TIMEOUT_MS ?? 120000);
    const parserRaw = await ollamaChat({
      system: PARSER_SYSTEM_PROMPT,
      user: cvForModel,
      format: 'json',
      timeoutMs: parseTimeoutMs,
      ollamaOptions: { num_predict: Number(process.env.OLLAMA_NUM_PREDICT_PARSE ?? 900) },
    });

    let parsedModel: { value: Record<string, unknown>; recovered: boolean };
    try {
      parsedModel = parseModelJson<Record<string, unknown>>(parserRaw);
    } catch (parseError: any) {
      log('warn', `candidate ${candidateId} parser JSON failed, attempting repair pass: ${parseError?.message ?? parseError}`);
      try {
        const repairedRaw = await ollamaChat({
          system: JSON_REPAIR_SYSTEM_PROMPT,
          user: 'Repair this malformed JSON into valid JSON while preserving content exactly where possible.\n\n' + parserRaw,
          format: 'json',
          timeoutMs: parseTimeoutMs,
          ollamaOptions: { num_predict: Number(process.env.OLLAMA_NUM_PREDICT_PARSE ?? 900) },
        });
        parsedModel = parseModelJson<Record<string, unknown>>(repairedRaw);
        log('warn', `candidate ${candidateId} parser JSON repair succeeded`);
      } catch (repairError: any) {
        log('warn', `candidate ${candidateId} parser JSON repair failed, using heuristic-only parse: ${repairError?.message ?? repairError}`);
        parsedModel = { value: {}, recovered: true };
      }
    }
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