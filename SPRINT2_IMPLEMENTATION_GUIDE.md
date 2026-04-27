# Sprint 2 - Candidature publique + GDPR + RH candidates

> **CRITICAL**: Follow this document exactly to ensure 100% consistency with the class diagram and sprint backlog. Do not deviate from specified structures, naming conventions, or implementation details.

---

## Table of Contents
1. [Overview](#overview)
2. [Class Diagram Requirements](#class-diagram-requirements)
3. [User Stories & Implementation Tasks](#user-stories--implementation-tasks)
4. [File Structure](#file-structure)
5. [Enum Definitions](#enum-definitions)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Testing Checklist](#testing-checklist)

---

## Overview

**Sprint Duration**: 22 days / member  
**Total Story Points**: 68  
**Focus**: Public job listing, public application with file upload, GDPR tracking/consent, application status workflow, HR candidate management.

### Core Components to Implement:
- Public job posting endpoint (open only)
- Candidate application with CV upload (validation)
- GDPR consent + retention tracking
- Email-based tracking code (verification flow)
- Self-service withdrawal (GDPR delete)
- HR candidate listing with pagination/filters
- Candidate detail view with download
- Candidate status workflow with transitions
- HR notes system

---

## Class Diagram Requirements

### Entity: Candidate (NEW)
```typescript
{
  id: number;
  fullName: string;
  email: string;
  linkedIn?: string;
  portfolio?: string;
  country: string;
  city: string;
  resume: Media;  // uploaded file relation
  status: ApplicationStatus;  // ENUM
  publicToken: string;  // for tracking/withdrawal
  trackingCodeHash: string;
  trackingCodeExpiresAt: DateTime;
  consent: boolean;
  consentAt?: DateTime;
  retentionUntil?: DateTime;
  hrNotes?: Text;
  candidateNotes?: Text;
  selfReportedYearsExperience?: number;
  job_posting: Relation<JobPosting>;  // manyToOne
}
```

### Entity: JobPosting (EXTEND)
```typescript
{
  id: number;
  title: string;
  description: text;
  status: JobPostingStatus;
  requirements: Requirements;
  candidates: Relation<Candidate>;  // oneToMany
}
```

### Value Object: Requirements (Already exists from Sprint 1)
```typescript
type Requirements = {
  skillsRequired: string[];
  skillsNiceToHave: string[];
  departments: string[];
  minYearsExperience: number;
  notes: string;
};
```

### Service: VerificationStore (EMAIL-BASED)
```typescript
class VerificationStore <<SERVICE>> {
  +generateCode(email: string): { code: string; cooldown: number }
  +verifyCode(email: string, code: string): { valid: boolean; error?: string }
  +cleanupExpiredCodes(): Promise<void>
}
```

### Service: EmailService
```typescript
class EmailService <<SERVICE>> {
  +sendVerificationCode(to: string, code: string): Promise<void>
}
```

---

## Enum Definitions

### ApplicationStatus
```typescript
enum ApplicationStatus {
  NEW = 'new',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  REVIEWING = 'reviewing',
  SHORTLISTED = 'shortlisted',
  REJECTED = 'rejected',
  HIRED = 'hired',
  ERROR = 'error'
}
```

---

## User Stories & Implementation Tasks

### S2-US1 (BE) - Create Candidate Schema [Priority: HIGH, 5 days]
**Description**: Establish Candidate entity with all required fields

**Files to Create/Update**:
- `backend/src/api/candidate/content-types/candidate/schema.json`

**Implementation**:
```json
{
  "kind": "collectionType",
  "collectionName": "candidates",
  "info": {
    "singularName": "candidate",
    "pluralName": "candidates",
    "displayName": "Candidate"
  },
  "options": {
    "increments": true,
    "timestamps": true,
    "draftAndPublish": false
  },
  "attributes": {
    "fullName": {
      "type": "string",
      "required": true,
      "minLength": 2,
      "maxLength": 255
    },
    "email": {
      "type": "email",
      "required": true,
      "index": true
    },
    "linkedIn": {
      "type": "string"
    },
    "portfolio": {
      "type": "string"
    },
    "country": {
      "type": "string",
      "required": true
    },
    "city": {
      "type": "string",
      "required": true
    },
    "resume": {
      "type": "media",
      "required": true
    },
    "status": {
      "type": "enumeration",
      "enum": ["new", "processing", "processed", "reviewing", "shortlisted", "rejected", "hired", "error"],
      "default": "new",
      "required": true
    },
    "publicToken": {
      "type": "string",
      "unique": true,
      "index": true
    },
    "trackingCodeHash": {
      "type": "string"
    },
    "trackingCodeExpiresAt": {
      "type": "datetime"
    },
    "consent": {
      "type": "boolean",
      "required": true,
      "default": false
    },
    "consentAt": {
      "type": "datetime"
    },
    "retentionUntil": {
      "type": "datetime"
    },
    "hrNotes": {
      "type": "text"
    },
    "candidateNotes": {
      "type": "text"
    },
    "selfReportedYearsExperience": {
      "type": "integer"
    },
    "job_posting": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::job-posting.job-posting",
      "required": true
    }
  }
}
```

**Testing Checklist**:
- [ ] Candidate schema created and migrated
- [ ] Required fields enforced
- [ ] publicToken is unique
- [ ] Status defaults to 'new'
- [ ] Email indexed for queries

---

### S2-US2 (BE) - Update JobPosting Schema (Add relation) [Priority: MEDIUM, 2 days]
**Description**: Add reverse relation to Candidate

**Files to Update**:
- `backend/src/api/job-posting/content-types/job-posting/schema.json`

**Implementation**:
Add to attributes:
```json
{
  "candidates": {
    "type": "relation",
    "relation": "oneToMany",
    "target": "api::candidate.candidate",
    "mappedBy": "job_posting"
  }
}
```

---

### S2-US3 (BE) - Public Jobs Endpoint [Priority: HIGH, 3 days]
**Description**: Expose only OPEN job postings to public

**Files to Create/Update**:
- `backend/src/api/job-posting/controllers/job-posting.ts`
- `backend/src/api/job-posting/routes/job-posting-status.ts`

**Implementation**:
```typescript
// controllers/job-posting.ts
export default factories.createCoreController('api::job-posting.job-posting', {
  async findOpen(ctx) {
    ctx.query = {
      ...ctx.query,
      filters: {
        ...(ctx.query.filters as any || {}),
        status: { $eq: 'open' }
      }
    };
    return super.find(ctx);
  }
});
```

**Routes**:
```typescript
// routes/job-posting-status.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/job-postings/public',
      handler: 'job-posting.findOpen',
      config: { auth: false, policies: [] }
    }
  ]
};
```

**API Endpoint**:
- GET `/api/job-postings/public` → returns all OPEN job postings (no auth required)

---

### S2-US4 (BE) - Candidate Apply Endpoint [Priority: HIGH, 6 days]
**Description**: Accept application with CV upload, validation, consent, and token generation

**Files to Create/Update**:
- `backend/src/api/candidate/controllers/candidate.ts`
- `backend/src/api/candidate/routes/candidate-public.ts`

**Implementation**:
```typescript
// controllers/candidate.ts (apply method)
async apply(ctx) {
  try {
    // Validate file
    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    const MAX_FILE_SIZE_MB = 5;

    const file = ctx.request.files?.resume;
    if (!file) {
      return ctx.badRequest('Resume file is required.');
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return ctx.badRequest(`Invalid file type. Allowed: PDF, DOCX, TXT.`);
    }
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      return ctx.badRequest(`File too large (${fileSizeMB.toFixed(1)} MB). Max: ${MAX_FILE_SIZE_MB} MB.`);
    }

    // Validate consent
    const { fullName, email, country, city, consent, job_posting_id } = ctx.request.body;
    if (!consent) {
      return ctx.badRequest('You must consent to data processing.');
    }

    // Upload file
    const uploadedFile = await strapi.plugin('upload').service('upload').upload({
      files: file
    });

    // Generate tokens
    const publicToken = generateUUID();
    const RETENTION_MONTHS = 24;
    const now = new Date();
    const retentionUntil = addMonths(now, RETENTION_MONTHS);

    // Create candidate
    const candidate = await strapi.documents('api::candidate.candidate').create({
      data: {
        fullName,
        email,
        country,
        city,
        resume: uploadedFile[0].id,
        status: 'new',
        publicToken,
        consent: true,
        consentAt: now.toISOString(),
        retentionUntil: retentionUntil.toISOString(),
        job_posting: job_posting_id
      }
    });

    return ctx.created({ data: candidate });
  } catch (err) {
    return ctx.internalServerError('Application submission failed.');
  }
}
```

**Routes**:
```typescript
// routes/candidate-public.ts
export default {
  routes: [
    {
      method: 'POST',
      path: '/candidates/apply',
      handler: 'candidate.apply',
      config: { auth: false }
    }
  ]
};
```

---

### S2-US5 (BE) - Tracking Code Generation [Priority: HIGH, 4 days]
**Description**: Email-based tracking without authentication

**Files to Create/Update**:
- `backend/src/utils/verification.ts` (new helper)
- `backend/src/api/candidate/controllers/candidate.ts`

**Implementation**:
```typescript
// utils/verification.ts
import crypto from 'crypto';

const TRACKING_CODE_TTL_MINUTES = 15;

export function generateTrackingCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function hashTrackingCode(email: string, code: string): string {
  return crypto.createHash('sha256').update(`${email}::${code}`).digest('hex');
}

export async function sendTrackingCodeEmail(email: string, code: string): Promise<void> {
  // Integrate with Strapi email plugin
  await strapi.plugin('email').service('email').send({
    to: email,
    subject: 'IOhire - Your Tracking Code',
    text: `Your tracking code is: ${code}. Valid for 15 minutes.`
  });
}
```

```typescript
// controllers/candidate.ts (request tracking code)
async requestTrackingCode(ctx) {
  const { email } = ctx.request.body;

  if (!email) {
    return ctx.badRequest('Email is required.');
  }

  const code = generateTrackingCode();
  const codeHash = hashTrackingCode(email, code);
  const expiresAt = new Date(Date.now() + TRACKING_CODE_TTL_MINUTES * 60 * 1000);

  // Store code temporarily in candidate record or cache
  await redis.setex(`tracking:${codeHash}`, TRACKING_CODE_TTL_MINUTES * 60, email);

  // Send email
  await sendTrackingCodeEmail(email, code);

  return ctx.ok({ message: 'Code sent to email.' });
}

async verifyTrackingCode(ctx) {
  const { email, code } = ctx.request.body;

  if (!email || !code) {
    return ctx.badRequest('Email and code are required.');
  }

  const codeHash = hashTrackingCode(email, code);
  const storedEmail = await redis.get(`tracking:${codeHash}`);

  if (!storedEmail || storedEmail !== email) {
    return ctx.badRequest('Invalid or expired code.');
  }

  // Retrieve candidate applications
  const applications = await strapi.documents('api::candidate.candidate').findMany({
    filters: { email: { $eq: email } },
    populate: ['job_posting']
  });

  return ctx.ok({ applications });
}
```

---

### S2-US6 (BE) - GDPR Withdrawal (Self-Service Delete) [Priority: HIGH, 4 days]
**Description**: Delete candidate and resume by public token

**Files to Create/Update**:
- `backend/src/api/candidate/controllers/candidate.ts`

**Implementation**:
```typescript
async withdraw(ctx) {
  const { token } = ctx.params;

  if (!token) {
    return ctx.badRequest('Token is required.');
  }

  try {
    const candidate = await strapi.documents('api::candidate.candidate').findMany({
      filters: { publicToken: { $eq: token } },
      populate: ['resume']
    });

    if (!candidate || candidate.length === 0) {
      return ctx.notFound('Application not found.');
    }

    const cand = candidate[0];

    // Delete resume file
    if ((cand as any).resume?.id) {
      await strapi.plugin('upload').service('upload').remove((cand as any).resume);
    }

    // Delete candidate record
    await strapi.documents('api::candidate.candidate').delete({
      documentId: cand.documentId
    });

    return ctx.ok({ message: 'Application withdrawn.' });
  } catch (err) {
    return ctx.internalServerError('Withdrawal failed.');
  }
}
```

---

### S2-US7 (BE) - HR Candidate Listing [Priority: HIGH, 5 days]
**Description**: Paginated, filterable candidate list for HR

**Files to Create/Update**:
- `backend/src/api/candidate/controllers/candidate.ts`

**Implementation**:
```typescript
async getAllHr(ctx) {
  const { page = 1, pageSize = 20, sort = '-createdAt', status, job_posting_id, search } = ctx.query;

  const filters: any = {};

  if (status) {
    filters.status = { $eq: status };
  }

  if (job_posting_id) {
    filters.job_posting = { documentId: job_posting_id };
  }

  if (search) {
    filters.$or = [
      { fullName: { $containsi: search } },
      { email: { $containsi: search } }
    ];
  }

  const candidates = await strapi.documents('api::candidate.candidate').findMany({
    filters,
    sort: parseSortParam(sort),
    limit: Number(pageSize),
    offset: (Number(page) - 1) * Number(pageSize),
    populate: ['job_posting']
  });

  const total = await strapi.documents('api::candidate.candidate').count({ filters });

  return ctx.ok({
    data: candidates,
    meta: {
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total
      }
    }
  });
}
```

---

### S2-US8 (BE) - HR Candidate Detail + Download CV [Priority: HIGH, 4 days]
**Description**: Full candidate view with CV download

**Files to Create/Update**:
- `backend/src/api/candidate/controllers/candidate.ts`

**Implementation**:
```typescript
async hrGetCandidate(ctx) {
  const { id } = ctx.params;

  const candidate = await strapi.documents('api::candidate.candidate').findOne({
    documentId: id,
    populate: ['job_posting', 'resume']
  });

  if (!candidate) {
    return ctx.notFound('Candidate not found.');
  }

  return ctx.ok({ data: candidate });
}

async downloadResume(ctx) {
  const { id } = ctx.params;

  const candidate = await strapi.documents('api::candidate.candidate').findOne({
    documentId: id,
    populate: ['resume']
  });

  if (!candidate || !(candidate as any).resume) {
    return ctx.notFound('Resume not found.');
  }

  const resume = (candidate as any).resume;
  const filePath = path.join(uploadsDir, 'uploads', resume.hash + resume.ext);

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const filename = `${candidate.fullName}_Resume${resume.ext}`;

    ctx.set('Content-Type', resume.mime || 'application/octet-stream');
    ctx.set('Content-Disposition', `attachment; filename="${filename}"`);
    ctx.body = fileBuffer;
  } catch (err) {
    return ctx.internalServerError('Download failed.');
  }
}
```

---

### S2-US9 (BE) - Status Transition Validation [Priority: HIGH, 4 days]
**Description**: Enforce valid status transitions

**Files to Create/Update**:
- `backend/src/api/candidate/controllers/candidate.ts`

**Implementation**:
```typescript
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['processing', 'rejected'],
  processing: ['processed', 'error'],
  processed: ['reviewing', 'rejected'],
  reviewing: ['shortlisted', 'rejected'],
  shortlisted: ['hired', 'rejected'],
  rejected: [],
  hired: [],
  error: ['processing']
};

async updateStatus(ctx) {
  const { id } = ctx.params;
  const { status: newStatus } = ctx.request.body;

  const candidate = await strapi.documents('api::candidate.candidate').findOne({
    documentId: id
  });

  if (!candidate) {
    return ctx.notFound('Candidate not found.');
  }

  const currentStatus = candidate.status;
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(newStatus)) {
    return ctx.badRequest(
      `Cannot transition from "${currentStatus}" to "${newStatus}".`
    );
  }

  const updated = await strapi.documents('api::candidate.candidate').update({
    documentId: id,
    data: { status: newStatus }
  });

  return ctx.ok({ data: updated });
}
```

---

### S2-US10 (BE) - HR Notes [Priority: MEDIUM, 3 days]
**Description**: Allow HR to add/update internal notes

**Files to Create/Update**:
- `backend/src/api/candidate/controllers/candidate.ts`

**Implementation**:
```typescript
async updateHrNotes(ctx) {
  const { id } = ctx.params;
  const { hrNotes } = ctx.request.body;

  if (hrNotes === undefined) {
    return ctx.badRequest('hrNotes field is required.');
  }

  const updated = await strapi.documents('api::candidate.candidate').update({
    documentId: id,
    data: { hrNotes: hrNotes?.trim() || null }
  });

  return ctx.ok({ data: updated });
}
```

---

### S2-US11 (FE) - Public Jobs Page [Priority: HIGH, 4 days]
**Description**: Display open jobs and allow filtering

**Files to Create/Update**:
- `frontend/src/app/pages/public-jobs/public-job-list.component.ts`
- `frontend/src/app/pages/public-jobs/public-job-list.component.html`

**Service Update**:
```typescript
// In job-posting.service.ts
getPublicJobs(): Observable<JobPosting[]> {
  return this.http.get<StrapiResponse<JobPosting>>(
    `http://localhost:1337/api/job-postings/public`
  ).pipe(
    map(res => res.data)
  );
}
```

---

### S2-US12 (FE) - Apply Form [Priority: HIGH, 5 days]
**Description**: Submit application with file upload and consent

**Files to Create/Update**:
- `frontend/src/app/pages/public-jobs/apply.component.ts`

---

### S2-US13 (FE) - Tracking Code Flow [Priority: HIGH, 4 days]
**Description**: 3-step tracking (request → enter code → view applications)

**Files to Create/Update**:
- `frontend/src/app/pages/public-jobs/track.component.ts`

---

### S2-US14 (FE) - Withdrawal (GDPR Delete) [Priority: MEDIUM, 3 days]
**Description**: Self-service deletion with confirmation

**Files to Create/Update**:
- `frontend/src/app/pages/public-jobs/withdraw.component.ts`

---

### S2-US15 (FE) - HR Candidates Listing [Priority: HIGH, 5 days]
**Description**: Paginated, filterable candidate table

**Files to Create/Update**:
- `frontend/src/app/pages/candidates/candidates-list.component.ts`

---

### S2-US16 (FE) - HR Candidate Detail [Priority: HIGH, 5 days]
**Description**: Full candidate view with status updates and notes

**Files to Create/Update**:
- `frontend/src/app/pages/candidates/candidate-detail.component.ts`

---

## File Structure

### Backend
```
backend/src/
├── api/
│   ├── candidate/
│   │   ├── content-types/candidate/
│   │   │   └── schema.json
│   │   ├── controllers/
│   │   │   └── candidate.ts
│   │   └── routes/
│   │       └── candidate-public.ts
│   └── job-posting/
│       ├── routes/
│       │   └── job-posting-status.ts
│       └── controllers/
│           └── job-posting.ts
└── utils/
    └── verification.ts
```

### Frontend
```
frontend/src/app/
├── pages/
│   ├── public-jobs/
│   │   ├── public-job-list.component.ts
│   │   ├── apply.component.ts
│   │   ├── track.component.ts
│   │   └── withdraw.component.ts
│   └── candidates/
│       ├── candidates-list.component.ts
│       └── candidate-detail.component.ts
└── services/
    └── candidate.service.ts (new)
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/job-postings/public` | ❌ | List open jobs |
| POST | `/api/candidates/apply` | ❌ | Submit application |
| POST | `/api/candidates/track/request-code` | ❌ | Request tracking code |
| POST | `/api/candidates/track/verify-code` | ❌ | Verify code & get apps |
| DELETE | `/api/candidates/withdraw/:token` | ❌ | Delete application |
| GET | `/api/candidates/hr` | ✅ | List candidates (paginated) |
| GET | `/api/candidates/hr/:id` | ✅ | Get candidate detail |
| GET | `/api/candidates/hr/:id/resume` | ✅ | Download CV |
| PUT | `/api/candidates/hr/:id/status` | ✅ | Update status |
| PUT | `/api/candidates/hr/:id/notes` | ✅ | Update HR notes |

---

## Testing Checklist

### Backend
- [ ] Candidate schema created with all required fields
- [ ] File upload validation (type, size)
- [ ] Consent required before application
- [ ] Retention date set to +24 months
- [ ] publicToken generated and unique
- [ ] Tracking code email sent
- [ ] Tracking code verification working
- [ ] Withdrawal deletes candidate and resume
- [ ] Status transitions validated
- [ ] HR notes updatable
- [ ] Pagination working on candidate list

### Frontend
- [ ] Public jobs page displays open jobs
- [ ] Apply form with file upload working
- [ ] Consent checkbox required
- [ ] Tracking code 3-step flow working
- [ ] Withdrawal confirmation working
- [ ] HR candidates list paginated
- [ ] HR candidate detail shows all info
- [ ] Status dropdown shows valid transitions only
- [ ] Download CV button working
- [ ] HR notes editable

---

## Notes
- Email sending requires Strapi email plugin configuration
- Redis or similar needed for tracking code storage
- CV file stored in uploads directory
- All dates in ISO 8601 format
- Pagination uses offset-based approach
