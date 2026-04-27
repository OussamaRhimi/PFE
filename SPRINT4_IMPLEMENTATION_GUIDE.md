# Sprint 4 - Evaluation avancee + analytics + IA publique

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

**Sprint Duration**: 24 days / member  
**Total Story Points**: 72  
**Focus**: Advanced evaluation configuration, analytics dashboard, public job recommendations, and chatbot assistance.

### Core Components to Implement:
- Per-job evaluation configuration (weight customization)
- Score-based filtering and bulk status updates
- Comprehensive analytics dashboard (KPIs, charts)
- Job recommendation engine (match scoring)
- Public chatbot for candidate FAQ support
- Meta endpoints for system-wide analytics

---

## Class Diagram Requirements

### Entity: JobPosting (EXTEND)
```typescript
{
  id: number;
  title: string;
  description: text;
  status: JobPostingStatus;
  requirements: Requirements;  // now includes EvaluationConfig
  candidates: Relation<Candidate>;
}
```

### Value Object: Requirements (EXTEND)
```typescript
type Requirements = {
  skillsRequired: string[];
  skillsNiceToHave: string[];
  departments: string[];
  minYearsExperience: number;
  notes: string;
  evaluationConfig?: EvaluationConfig;  // NEW: optional config per job
};
```

### Value Object: EvaluationConfig (EXTEND with thresholds)
```typescript
type EvaluationConfig = {
  fitWeight: number;  // default 75
  completenessWeight: number;  // default 25
  requiredSkillsWeight: number;
  niceToHaveSkillsWeight: number;
  experienceWeight: number;
  completenessPoints: JSON;  // section weights
  qualityThresholds: JSON;  // score ranges for labels
};
```

### Transient: JobRecommendation (NEW)
```typescript
class JobRecommendation {
  +id: Integer
  +title: String
  +compatibility: Decimal
  +matchedRequired: String[*]
  +missingRequired: String[*]
}
```

### Transient: AnalyticsSnapshot (NEW)
```typescript
class AnalyticsSnapshot {
  +totalJobPostings: Integer
  +totalCandidates: Integer
  +averageScore: Decimal
  +statusDistribution: JSON
  +scoreHistogram: JSON
}
```

### Transient: ChatSession & ChatMessage (NEW)
```typescript
class ChatSession {
  +id: String
  +messages: ChatMessage[*]
}

class ChatMessage {
  +role: ChatRole  // USER, ASSISTANT
  +content: String
}
```

### Service: AIProcessor (EXTEND)
```typescript
class AIProcessor {
  // ... existing methods ...
  +recommendJobPostings(resume: Media): JobRecommendation[*]
  +generateChatResponse(messages: ChatMessage[*]): String
  +evaluateWithConfig(candidate: Candidate, config: EvaluationConfig): EvaluationResult
}
```

---

## Enum Definitions

### ChatRole
```typescript
enum ChatRole {
  USER = 'user',
  ASSISTANT = 'assistant'
}
```

---

## User Stories & Implementation Tasks

### S4-US1 (BE) - Update Requirements Schema [Priority: HIGH, 3 days]
**Description**: Add evaluationConfig to Requirements JSON

**Files to Update**:
- `backend/src/api/job-posting/content-types/job-posting/schema.json`

**Update requirements field**:
```json
{
  "requirements": {
    "type": "json",
    "required": false,
    "description": "Job requirements with optional evaluation config"
  }
}
```

**Sample data structure**:
```json
{
  "requirements": {
    "skillsRequired": ["React", "Node.js"],
    "skillsNiceToHave": ["Docker", "Kubernetes"],
    "minYearsExperience": 3,
    "evaluationConfig": {
      "fitWeight": 75,
      "completenessWeight": 25,
      "requiredSkillsWeight": 50,
      "niceToHaveSkillsWeight": 20,
      "experienceWeight": 30,
      "completenessPoints": {
        "summary": 10,
        "skills": 20,
        "experience": 40,
        "education": 30
      },
      "qualityThresholds": {
        "excellent": 80,
        "good": 60,
        "fair": 40,
        "poor": 0
      }
    }
  }
}
```

---

### S4-US2 (BE) - Evaluation Config Endpoint [Priority: HIGH, 4 days]
**Description**: Get/update evaluation config for a job

**Files to Create/Update**:
- `backend/src/api/job-posting/controllers/job-posting.ts`
- `backend/src/api/job-posting/routes/job-posting-eval.ts`

**Implementation**:
```typescript
// controllers
async getEvalConfig(ctx) {
  const { id } = ctx.params;

  const jobPosting = await strapi.documents('api::job-posting.job-posting').findOne({
    documentId: id
  });

  if (!jobPosting) {
    return ctx.notFound('Job posting not found.');
  }

  const raw = (jobPosting as any).requirements?.evaluationConfig || null;
  const defaults = {
    fitWeight: 75,
    completenessWeight: 25,
    requiredSkillsWeight: 50,
    niceToHaveSkillsWeight: 20,
    experienceWeight: 30
  };

  return ctx.ok({
    evaluationConfig: raw || defaults,
    defaults
  });
}

async updateEvalConfig(ctx) {
  const { id } = ctx.params;
  const { evaluationConfig } = ctx.request.body;

  const jobPosting = await strapi.documents('api::job-posting.job-posting').findOne({
    documentId: id
  });

  if (!jobPosting) {
    return ctx.notFound('Job posting not found.');
  }

  const updated = await strapi.documents('api::job-posting.job-posting').update({
    documentId: id,
    data: {
      requirements: {
        ...((jobPosting as any).requirements || {}),
        evaluationConfig
      }
    }
  });

  return ctx.ok({ data: updated });
}
```

**Routes**:
```typescript
export default {
  routes: [
    {
      method: 'GET',
      path: '/job-postings/:id/eval-config',
      handler: 'job-posting.getEvalConfig',
      config: { auth: true }
    },
    {
      method: 'PUT',
      path: '/job-postings/:id/eval-config',
      handler: 'job-posting.updateEvalConfig',
      config: { auth: true }
    }
  ]
};
```

---

### S4-US3 (BE) - Score Filtering & Bulk Update [Priority: HIGH, 4 days]
**Description**: Filter candidates by score range, update status in bulk

**Files to Update**:
- `backend/src/api/candidate/controllers/candidate.ts`

**Implementation**:
```typescript
async filterByScore(ctx) {
  const { scoreOp, scoreValue, page = 1, pageSize = 20 } = ctx.query;
  // scoreOp: 'gt' or 'lt'

  if (!scoreOp || !scoreValue) {
    return ctx.badRequest('scoreOp and scoreValue required.');
  }

  const scoreNumber = Math.min(100, Math.max(0, Number(scoreValue)));
  const op = scoreOp === 'lt' ? '$lt' : '$gt';

  const filters = {
    score: { $notNull: true, [op]: scoreNumber }
  };

  const candidates = await strapi.documents('api::candidate.candidate').findMany({
    filters,
    limit: Number(pageSize),
    offset: (Number(page) - 1) * Number(pageSize),
    sort: { score: 'desc' }
  });

  const total = await strapi.documents('api::candidate.candidate').count({ filters });

  return ctx.ok({
    data: candidates,
    meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total } }
  });
}

async bulkUpdateStatus(ctx) {
  const { ids, status } = ctx.request.body;

  if (!Array.isArray(ids) || !status) {
    return ctx.badRequest('ids array and status required.');
  }

  const updated = await Promise.all(
    ids.map(id =>
      strapi.documents('api::candidate.candidate').update({
        documentId: id,
        data: { status }
      })
    )
  );

  return ctx.ok({ data: updated });
}
```

---

### S4-US4 (BE) - Analytics Meta Endpoint [Priority: HIGH, 5 days]
**Description**: System-wide KPIs and statistics

**Files to Create/Update**:
- `backend/src/api/meta/controllers/meta.ts`
- `backend/src/api/meta/routes/meta.ts`

**Implementation**:
```typescript
export default factories.createCoreController('api::meta.meta', {
  async getAnalytics(ctx) {
    const jobPostings = await strapi.documents('api::job-posting.job-posting').findMany({
      fields: ['status']
    });

    const candidates = await strapi.documents('api::candidate.candidate').findMany({
      fields: ['status', 'score']
    });

    // Status distributions
    const jobPostingStatuses = Object.values(
      groupBy(jobPostings, 'status')
    ).map((group: any) => ({
      status: group[0].status,
      count: group.length
    }));

    const candidateStatuses = Object.values(
      groupBy(candidates, 'status')
    ).map((group: any) => ({
      status: group[0].status,
      count: group.length
    }));

    // Score histogram
    const scoreBuckets = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0
    };

    candidates.forEach(c => {
      const score = c.score || 0;
      if (score <= 20) scoreBuckets['0-20']++;
      else if (score <= 40) scoreBuckets['21-40']++;
      else if (score <= 60) scoreBuckets['41-60']++;
      else if (score <= 80) scoreBuckets['61-80']++;
      else scoreBuckets['81-100']++;
    });

    const avgScore =
      candidates.length > 0
        ? Math.round(
            candidates.reduce((sum: number, c: any) => sum + (c.score || 0), 0) /
              candidates.length
          )
        : 0;

    return ctx.ok({
      totalJobPostings: jobPostings.length,
      totalCandidates: candidates.length,
      averageScore: avgScore,
      jobPostingStatuses,
      candidateStatuses,
      scoreHistogram: scoreBuckets
    });
  }
});
```

---

### S4-US5 (BE) - Job Recommendations [Priority: HIGH, 8 days]
**Description**: Suggest best-matching jobs for a resume

**Files to Create/Update**:
- `backend/src/api/candidate/controllers/candidate.ts`

**Implementation**:
```typescript
async getRecommendations(ctx) {
  try {
    const { jobId } = ctx.request.body;  // candidate's applied job

    // Get open jobs
    const openJobs = await strapi.documents('api::job-posting.job-posting').findMany({
      filters: { status: { $eq: 'open' } },
      fields: ['id', 'title', 'description', 'requirements'],
      limit: 50
    });

    if (openJobs.length === 0) {
      return ctx.ok({ recommendations: [] });
    }

    // For each job, score compatibility
    const recommendations = openJobs.map(job => {
      const compatibility = calculateJobCompatibility(
        ctx.request.body.extractedData, // from request
        (job as any).requirements
      );

      return {
        id: job.id,
        title: job.title,
        compatibility: Math.round(compatibility),
        matchedRequired: getMatchedSkills(ctx.request.body.extractedData, job),
        missingRequired: getMissingSkills(ctx.request.body.extractedData, job)
      };
    });

    // Sort by compatibility descending
    recommendations.sort((a, b) => b.compatibility - a.compatibility);

    return ctx.ok({ recommendations: recommendations.slice(0, 10) });
  } catch (err) {
    return ctx.internalServerError('Recommendation failed.');
  }
}

function calculateJobCompatibility(extractedData: any, requirements: any): number {
  const requiredSkills = requirements.skillsRequired || [];
  const candidateSkills = extractedData.skills || [];

  const matched = requiredSkills.filter(s =>
    candidateSkills.some(cs => cs.toLowerCase().includes(s.toLowerCase()))
  ).length;

  return requiredSkills.length > 0 ? (matched / requiredSkills.length) * 100 : 50;
}
```

---

### S4-US6 (BE) - Chatbot for Public [Priority: MEDIUM, 6 days]
**Description**: FAQ chatbot using Ollama

**Files to Create/Update**:
- `backend/src/api/candidate/controllers/candidate.ts`

**Implementation**:
```typescript
const CHATBOT_SYSTEM_PROMPT = `You are IOhire, a helpful recruitment assistant. Answer questions about job applications, the hiring process, and our company. Be friendly and concise.`;

async chat(ctx) {
  try {
    const { messages } = ctx.request.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return ctx.badRequest('Messages array required.');
    }

    // Sanitize and format messages
    const sanitized = messages.slice(-10).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: String(msg.content || '').slice(0, 1000)
    }));

    // Call Ollama with message history
    const formattedMessages = [
      { role: 'system', content: CHATBOT_SYSTEM_PROMPT },
      ...sanitized
    ];

    const response = await ollamaChat(CHATBOT_SYSTEM_PROMPT, sanitized[sanitized.length - 1].content);

    return ctx.ok({ reply: response.trim() });
  } catch (err) {
    return ctx.internalServerError('Chat failed.');
  }
}
```

**Routes**:
```typescript
{
  method: 'POST',
  path: '/chat',
  handler: 'candidate.chat',
  config: { auth: false }
}
```

---

### S4-US7 (FE) - Evaluation Configuration UI [Priority: MEDIUM, 4 days]
**Description**: Adjust scoring weights per job

**Files to Create/Update**:
- `frontend/src/app/pages/ai-evaluation/ai-evaluation.component.ts`

**Component Outline**:
```typescript
export class AiEvaluationComponent implements OnInit {
  jobId: string | null = null;
  evaluationConfig: EvaluationConfig | null = null;
  loading = false;
  saving = false;

  ngOnInit() {
    if (this.jobId) {
      this.loadConfig();
    }
  }

  loadConfig(): void {
    this.jobService.getEvalConfig(this.jobId!).subscribe({
      next: (res) => {
        this.evaluationConfig = res.evaluationConfig;
      }
    });
  }

  saveConfig(): void {
    if (!this.evaluationConfig || !this.jobId) return;
    
    this.saving = true;
    this.jobService.updateEvalConfig(this.jobId, this.evaluationConfig).subscribe({
      next: () => {
        this.saving = false;
        // Show success message
      },
      error: () => {
        this.saving = false;
        // Show error message
      }
    });
  }
}
```

---

### S4-US8 (FE) - Analytics Dashboard [Priority: MEDIUM, 5 days]
**Description**: KPI cards, status charts, score histogram

**Files to Create/Update**:
- `frontend/src/app/pages/analytics/analytics.component.ts`
- `frontend/src/app/pages/analytics/analytics.component.html`

**Component Outline**:
```typescript
export class AnalyticsComponent implements OnInit {
  analytics: AnalyticsSnapshot | null = null;
  loading = false;

  constructor(
    private metaService: MetaService,
    private jobService: JobPostingService,
    private candidateService: CandidateService
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading = true;
    this.metaService.getAnalytics().subscribe({
      next: (data) => {
        this.analytics = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
```

**MetaService** (new):
```typescript
@Injectable({ providedIn: 'root' })
export class MetaService {
  private API_URL = 'http://localhost:1337/api/meta';

  constructor(private http: HttpClient) {}

  getAnalytics(): Observable<AnalyticsSnapshot> {
    return this.http.get<AnalyticsSnapshot>(`${this.API_URL}/analytics`);
  }
}
```

---

### S4-US9 (FE) - Public Recommendations [Priority: MEDIUM, 4 days]
**Description**: Show recommended jobs based on CV

**Files to Create/Update**:
- `frontend/src/app/pages/public-jobs/recommendation.component.ts`

---

### S4-US10 (FE) - Chat Widget [Priority: MEDIUM, 5 days]
**Description**: Floating/modal chat interface for public users

**Files to Create/Update**:
- `frontend/src/app/components/public-chat-widget/public-chat-widget.component.ts`
- `frontend/src/app/components/public-chat-widget/public-chat-widget.component.html`

**Component Outline**:
```typescript
@Component({
  selector: 'app-public-chat-widget',
  templateUrl: './public-chat-widget.component.html',
  styleUrls: ['./public-chat-widget.component.scss']
})
export class PublicChatWidgetComponent {
  messages: ChatMessage[] = [];
  userInput = '';
  isOpen = false;
  loading = false;

  constructor(private candidateService: CandidateService) {}

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  sendMessage(): void {
    if (!this.userInput.trim()) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: this.userInput
    };

    this.messages.push(userMsg);
    this.loading = true;

    this.candidateService.chat(this.messages).subscribe({
      next: (res) => {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: res.reply
        };
        this.messages.push(assistantMsg);
        this.userInput = '';
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
```

---

## File Structure

### Backend
```
backend/src/
├── api/
│   ├── meta/
│   │   ├── controllers/
│   │   │   └── meta.ts
│   │   └── routes/
│   │       └── meta.ts
│   ├── job-posting/
│   │   ├── routes/
│   │   │   └── job-posting-eval.ts
│   │   └── controllers/
│   │       └── job-posting.ts
│   └── candidate/
│       ├── routes/
│       │   └── candidate-public.ts
│       └── controllers/
│           └── candidate.ts
└── utils/
    └── candidate-ai.ts (extend)
```

### Frontend
```
frontend/src/app/
├── pages/
│   ├── ai-evaluation/
│   │   └── ai-evaluation.component.ts
│   ├── analytics/
│   │   └── analytics.component.ts
│   └── public-jobs/
│       ├── recommendation.component.ts
│       └── withdraw.component.ts
├── components/
│   └── public-chat-widget/
│       ├── public-chat-widget.component.ts
│       └── public-chat-widget.component.html
└── services/
    └── meta.service.ts (new)
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/job-postings/:id/eval-config` | ✅ | Get evaluation config |
| PUT | `/api/job-postings/:id/eval-config` | ✅ | Update evaluation config |
| GET | `/api/candidates/score-filter` | ✅ | Filter by score |
| POST | `/api/candidates/bulk-status` | ✅ | Bulk update status |
| GET | `/api/meta/analytics` | ✅ | Get system analytics |
| POST | `/api/candidates/recommendations` | ❌ | Get job recommendations |
| POST | `/api/candidates/chat` | ❌ | Chat with bot |

---

## Testing Checklist

### Backend
- [ ] Evaluation config stored correctly in Requirements
- [ ] Evaluation config endpoint GET/PUT working
- [ ] Score filtering works (gt/lt)
- [ ] Bulk status update applies to all specified IDs
- [ ] Analytics snapshot calculated correctly
- [ ] Job recommendation algorithm scores properly
- [ ] Chatbot responds to messages
- [ ] Message history maintained in chat

### Frontend
- [ ] Evaluation config UI loads and saves
- [ ] Weight sliders functional
- [ ] Analytics dashboard displays all KPIs
- [ ] Status charts rendered correctly
- [ ] Score histogram shows distribution
- [ ] Recommendation list displays with scores
- [ ] Chat widget opens/closes
- [ ] Chat messages sent and received
- [ ] Loading states shown during API calls

---

## Notes
- Evaluation config is per-job, stored in Requirements JSON
- All weights must sum to 100
- Chatbot uses same Ollama instance as CV parsing
- Analytics aggregated from entire candidate pool
- Message history preserved for context in chat
