/**
 * Sprint 3: Ollama LLM Integration
 * @file src/utils/ollama.ts
 */

import { safeParseJson } from './json';
import type { ExtractedData } from './types';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

export type OllamaChatOptions = {
  system: string;
  user: string;
  model?: string;
  format?: 'json' | 'text';
  timeoutMs?: number;
  ollamaOptions?: Record<string, unknown>;
  keepAlive?: string | number;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
};

/**
 * System prompt for CV parsing
 */
export const PARSER_SYSTEM_PROMPT = `Extract contact info, skills, and work history from this CV into a clean JSON structure.
Return ONLY valid JSON (no markdown, no code fences).

IMPORTANT - DATE FORMATS:
For all dates (startDate, endDate), extract in this priority order:
1. If "Month YYYY" format exists (e.g. "June 2025"), use it exactly: "June 2025"
2. If "Month YYYY – Month YYYY" format (e.g. "June 2022 – August 2024"), parse both dates: startDate="June 2022", endDate="August 2024"
3. If "YYYY–YYYY" format (e.g. "2022–2024"), parse both years: startDate="2022", endDate="2024"
4. If "MM/YYYY" format (e.g. "06/2025"), convert to "June 2025"
5. If only a year is given (e.g. "2022"), use "2022" as is
6. If the role is current/ongoing (e.g. "Present", "Current", "Ongoing"), set endDate to "Present"
ALWAYS extract BOTH startDate and endDate separately - never combine them as one string.

SECTION HEADER RECOGNITION:
Recognize these header variations as work experience sections (treat them identically - merge if multiple):
- "Work Experience" / "Experience" / "Professional Experience" / "Career" / "Employment" / "Work History" / "Professional Background"

Recognize these as education sections (treat them identically - merge if multiple):
- "Education" / "Academic Background" / "Qualifications" / "Studies" / "Academic Qualifications" / "Schooling"

Recognize these as skills sections (treat them IDENTICALLY - merge into single "skills" array if multiple appear):
- "Skills" / "Technical Skills" / "Core Skills" / "Competencies" / "Technologies" / "Technical Expertise"
- "Programming Languages" / "Tools & Technologies" / "Technical Stack" / "Expertise" / "Core Competencies"
- "Technical Knowledge" / "Specializations" / "Capabilities" / "Technical Proficiencies"

IMPORTANT: "Skills" section headers and "Technical Skills" section headers are the SAME thing.
If a CV has both "Skills" and "Technical Skills" sections, merge all items into the single "skills" array.
Do NOT duplicate items. Extract unique skills only.

CRITICAL CLASSIFICATION RULES:
- "skills" array: ONLY short technology/tool names (e.g. "React", "Node.js", "Docker", "Python", "AWS").
  - This includes items from: "Skills", "Technical Skills", "Core Skills", "Technologies", "Technical Expertise", 
    "Tools & Technologies", "Programming Languages", "Technical Stack", "Technical Knowledge", "Specializations"
  - If a skills section header appears (ANY variation), extract all technical items there as "skills"
  - When multiple skill-type sections exist, combine them into one "skills" array (avoid duplicates)
  
- "competencies" array: accomplishment descriptions or capability statements that describe WHAT the person can DO
  - e.g. "Built scalable microservices", "Designed user interfaces", "Led cross-functional teams"
  - These are sentences/phrases describing capabilities, NOT tool names
  - Only use "competencies" if there's an explicit "Competencies" section that contains descriptions, NOT tool lists
  
- "education" is for degrees, diplomas, academic programs
- "certifications" is for professional certifications, online courses, bootcamps
- "projects" is for personal/academic projects

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
}

EXAMPLE 1 INPUT:
"OMAR ATRI\nFull Stack JS Developer\ncontact@omaratri.com\n+216 24 246 962\nKerkennah, Sfax, Tunisia\nlinkedin.com/in/omar-atri\nSKILLS\nNextJS – ReactJS – GatsbyJS – TailwindCSS\nExpressJS – Socket.IO\nEDUCATION\nSeptember 2021 - June 2026 Software engineering\nHigher Institute of Computer Science and Multimedia of Sfax (ISIMS)"

EXAMPLE 1 OUTPUT:
{
  "contact": {
    "fullName": "Omar Atri",
    "email": "contact@omaratri.com",
    "phone": "+216 24 246 962",
    "location": "Kerkennah, Sfax, Tunisia",
    "linkedin": "linkedin.com/in/omar-atri",
    "portfolio": null,
    "links": ["linkedin.com/in/omar-atri"]
  },
  "summary": "Full Stack JS Developer",
  "skills": ["NextJS", "ReactJS", "GatsbyJS", "TailwindCSS", "ExpressJS", "Socket.IO"],
  "competencies": [],
  "languages": [],
  "qualities": [],
  "interests": [],
  "experience": [],
  "education": [{
    "school": "Higher Institute of Computer Science and Multimedia of Sfax (ISIMS)",
    "degree": "Software engineering",
    "startDate": "September 2021",
    "endDate": "June 2026"
  }],
  "certifications": [],
  "projects": []
}

EXAMPLE 2 INPUT:
"Yassin Sedki\nsedkiyassin19@gmail.com\n+216 93913842\nKsour Essef, Mahdia\nPROFILE\nFinal-year Software Engineering student focused on AI systems.\nEXPERIENCE\nAI Engineer Intern\nAttoflow Consulting\n06/2025 – 08/2025\nSKILLS\nPyTorch, TensorFlow, LangChain, LangGraph"

EXAMPLE 2 OUTPUT:
{
  "contact": {
    "fullName": "Yassin Sedki",
    "email": "sedkiyassin19@gmail.com",
    "phone": "+216 93913842",
    "location": "Ksour Essef, Mahdia",
    "linkedin": null,
    "portfolio": null,
    "links": []
  },
  "summary": "Final-year Software Engineering student focused on AI systems.",
  "skills": ["PyTorch", "TensorFlow", "LangChain", "LangGraph"],
  "competencies": [],
  "languages": [],
  "qualities": [],
  "interests": [],
  "experience": [{
    "company": "Attoflow Consulting",
    "title": "AI Engineer Intern",
    "startDate": "June 2025",
    "endDate": "August 2025",
    "highlights": []
  }],
  "education": [],
  "certifications": [],
  "projects": []
}

EXAMPLE 3 INPUT (YYYY-YYYY dates and section header variation):
"Karim Haddad
DevOps Engineer
Email: karim.haddad.ops@gmail.com
Phone: +216 54 778 902
Location: Sousse, Tunisia
LinkedIn: https://linkedin.com/in/karim-haddad-devops
Portfolio: https://karimops.dev
Professional Summary
DevOps engineer focused on CI/CD pipelines, cloud infrastructure and automation.
Technical Skills
- Docker
- Kubernetes
- AWS
- Terraform
- Linux
- GitHub Actions
- Prometheus
- Grafana
Work Experience
DevOps Engineer — North Africa Cloud Services (2022–2024)
- Built CI/CD pipelines using GitHub Actions
- Managed Kubernetes clusters for production workloads
- Implemented monitoring using Prometheus and Grafana
Education
Master in Computer Networks – University of Sousse (2019–2022)
Projects
Kubernetes Deployment Template — https://github.com/karimops/k8s-template
- Reusable Kubernetes deployment configuration for microservices."

EXAMPLE 3 OUTPUT (demonstrating YYYY-YYYY date parsing):
{
  "contact": {
    "fullName": "Karim Haddad",
    "email": "karim.haddad.ops@gmail.com",
    "phone": "+216 54 778 902",
    "location": "Sousse, Tunisia",
    "linkedin": "https://linkedin.com/in/karim-haddad-devops",
    "portfolio": "https://karimops.dev",
    "links": ["https://linkedin.com/in/karim-haddad-devops", "https://karimops.dev"]
  },
  "summary": "DevOps engineer focused on CI/CD pipelines, cloud infrastructure and automation.",
  "skills": ["Docker", "Kubernetes", "AWS", "Terraform", "Linux", "GitHub Actions", "Prometheus", "Grafana"],
  "competencies": [],
  "languages": [],
  "qualities": [],
  "interests": [],
  "experience": [{
    "company": "North Africa Cloud Services",
    "title": "DevOps Engineer",
    "startDate": "2022",
    "endDate": "2024",
    "highlights": [
      "Built CI/CD pipelines using GitHub Actions",
      "Managed Kubernetes clusters for production workloads",
      "Implemented monitoring using Prometheus and Grafana"
    ]
  }],
  "education": [{
    "school": "University of Sousse",
    "degree": "Master in Computer Networks",
    "startDate": "2019",
    "endDate": "2022"
  }],
  "certifications": [],
  "projects": [{
    "name": "Kubernetes Deployment Template",
    "description": "Reusable Kubernetes deployment configuration for microservices.",
    "links": ["https://github.com/karimops/k8s-template"]
  }]
}

EXAMPLE 4 INPUT (Multiple skills sections with different headers - should merge into one):
"Alex Johnson
Full Stack Developer
alex@example.com
+1 (555) 123-4567
San Francisco, CA

Professional Summary
Experienced developer proficient in modern web technologies and cloud platforms.

Skills
- React
- Vue.js
- TypeScript
- HTML/CSS

Technical Skills
- Node.js
- Express
- MongoDB
- PostgreSQL

Core Competencies
- RESTful API Design
- Database Optimization
- Responsive Design
- Agile Development

Education
Bachelor of Science in Computer Science
University of California (2020–2024)"

EXAMPLE 4 OUTPUT (All skill sections merged into single "skills" array - no duplicates):
{
  "contact": {
    "fullName": "Alex Johnson",
    "email": "alex@example.com",
    "phone": "+1 (555) 123-4567",
    "location": "San Francisco, CA",
    "linkedin": null,
    "portfolio": null,
    "links": []
  },
  "summary": "Experienced developer proficient in modern web technologies and cloud platforms.",
  "skills": ["React", "Vue.js", "TypeScript", "HTML/CSS", "Node.js", "Express", "MongoDB", "PostgreSQL"],
  "competencies": ["RESTful API Design", "Database Optimization", "Responsive Design", "Agile Development"],
  "languages": [],
  "qualities": [],
  "interests": [],
  "experience": [],
  "education": [{
    "school": "University of California",
    "degree": "Bachelor of Science in Computer Science",
    "startDate": "2020",
    "endDate": "2024"
  }],
  "certifications": [],
  "projects": []
}`;

/**
 * Send a chat message to Ollama and get response
 */
export async function ollamaChat(systemPrompt: string, userPrompt: string): Promise<string>;
export async function ollamaChat(options: OllamaChatOptions): Promise<string>;
export async function ollamaChat(
  arg1: string | OllamaChatOptions,
  userPrompt?: string
): Promise<string> {
  const options: OllamaChatOptions = typeof arg1 === 'string'
    ? { system: arg1, user: userPrompt ?? '' }
    : arg1;

  let messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> | null =
    Array.isArray(options.messages) && options.messages.length > 0 ? [...options.messages] : null;

  if (messages) {
    const hasSystem = messages.some((m) => m.role === 'system');
    if (options.system && !hasSystem) {
      messages = [{ role: 'system', content: options.system }, ...messages];
    }
  } else {
    messages = [
      { role: 'system', content: options.system },
      { role: 'user', content: options.user },
    ];
  }

  const promptFromMessages = (items: Array<{ role: string; content: string }>) =>
    items
      .map((m) => {
        if (m.role === 'system') return `System:\n${m.content}`;
        if (m.role === 'assistant') return `Assistant:\n${m.content}`;
        return `User:\n${m.content}`;
      })
      .join('\n\n');

  const baseUrl = OLLAMA_BASE_URL.replace(/\/+$/, '');
  const apiBase = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

  const timeoutMs = options.timeoutMs ?? 240000;
  const keepAlive = options.keepAlive ?? process.env.OLLAMA_KEEP_ALIVE ?? '5m';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const chatResponse = await fetch(`${apiBase}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model || OLLAMA_MODEL,
      messages,
      stream: false,
      ...(options.format ? { format: options.format } : {}),
      ...(options.ollamaOptions ? { options: options.ollamaOptions } : {}),
      ...(options.format === 'json' ? { options: { temperature: 0, ...(options.ollamaOptions ?? {}) } } : {}),
      keep_alive: keepAlive,
    }),
    signal: controller?.signal,
  });

  clearTimeout(timeoutId);

  if (chatResponse.ok) {
    const data = (await chatResponse.json()) as { message?: { content?: string } };
    return data.message?.content || '';
  }

  if (chatResponse.status !== 404) {
    throw new Error(`Ollama request failed: ${chatResponse.status} ${chatResponse.statusText}`);
  }

  const generateResponse = await fetch(`${apiBase}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model || OLLAMA_MODEL,
      prompt: promptFromMessages(messages),
      stream: false,
      ...(options.format ? { format: options.format } : {}),
      ...(options.ollamaOptions ? { options: options.ollamaOptions } : {}),
      ...(options.format === 'json' ? { options: { temperature: 0, ...(options.ollamaOptions ?? {}) } } : {}),
      keep_alive: keepAlive,
    }),
    signal: controller?.signal,
  });

  if (!generateResponse.ok) {
    throw new Error(`Ollama request failed: ${generateResponse.status} ${generateResponse.statusText}`);
  }

  const data = (await generateResponse.json()) as { response?: string };
  return data.response || '';
}

/**
 * Parse resume text via Ollama into structured ExtractedData
 */
export async function parseResumeWithOllama(resumeText: string): Promise<ExtractedData> {
  const response = await ollamaChat(PARSER_SYSTEM_PROMPT, resumeText);
  const parsed = safeParseJson<ExtractedData>(response);

  if (!parsed) {
    throw new Error('Failed to parse CV: Invalid JSON response from Ollama');
  }

  // Ensure required arrays exist with defaults
  return {
    contact: parsed.contact || {},
    summary: parsed.summary || null,
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    competencies: Array.isArray(parsed.competencies) ? parsed.competencies : [],
    languages: Array.isArray(parsed.languages) ? parsed.languages : [],
    qualities: Array.isArray(parsed.qualities) ? parsed.qualities : [],
    interests: Array.isArray(parsed.interests) ? parsed.interests : [],
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
    certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
  };
}
