/**
 * Sprint 3: Type Definitions
 * @file src/utils/types.ts
 */

// ============================================================================
// CV Template Types
// ============================================================================

/** CV Template keys - 11 templates (MUST MATCH EXACTLY) */
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

/** Template metadata for catalog */
export interface CvTemplateMeta {
  key: CvTemplateKey;
  name: string;
  description: string;
}

// ============================================================================
// Application Status
// ============================================================================

/** Application status enum values (MUST MATCH EXACTLY) */
export type ApplicationStatus =
  | 'new'
  | 'processing'
  | 'processed'
  | 'reviewing'
  | 'shortlisted'
  | 'rejected'
  | 'hired'
  | 'error';

// ============================================================================
// Job Posting Types
// ============================================================================

/** Job posting status */
export type JobPostingStatus = 'draft' | 'open' | 'closed';

/** Requirements value object (embedded JSON in JobPosting) */
export interface Requirements {
  skillsRequired: string[];
  skillsNiceToHave: string[];
  departments: string[];
  minYearsExperience: number;
  notes: string;
  evaluationConfig?: EvaluationConfig;
}

/** Evaluation configuration (optional, Sprint 4 focus) */
export interface EvaluationConfig {
  fitWeight?: number;
  completenessWeight?: number;
  requiredSkillsWeight?: number;
  niceToHaveSkillsWeight?: number;
  experienceWeight?: number;
  completenessPoints?: {
    fullName?: number;
    email?: number;
    phone?: number;
    location?: number;
    links?: number;
    linkedin?: number;
    portfolio?: number;
    summary?: number;
    competencies?: number;
    experience?: number;
    experienceDates?: number;
    education?: number;
  };
  customCriteria?: Array<{
    name: string;
    type: 'bonus' | 'penalty';
    points: number;
    keywords: string[];
    requireAll: boolean;
  }>;
  qualityThresholds?: {
    excellent?: number;
    good?: number;
    fair?: number;
  };
}

// ============================================================================
// Extracted Data Types (from CV parsing)
// ============================================================================

/** Contact information extracted from CV */
export interface ResumeContact {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  portfolio?: string;
  links?: string[];
}

/** Work experience entry */
export interface ExperienceEntry {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  highlights: string[];
}

/** Education entry */
export interface EducationEntry {
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
}

/** Project entry */
export interface ProjectEntry {
  name: string;
  description: string;
  links: string[];
}

/** Full extracted data structure from CV parsing */
export interface ExtractedData {
  contact: ResumeContact;
  summary?: string | null;
  skills: string[];
  competencies: string[];
  languages: string[];
  qualities: string[];
  interests: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certifications: string[];
  projects: ProjectEntry[];
}

/** Resume content for template rendering (contact is optional in generated content) */
export type ResumeContent = Partial<Omit<ExtractedData, 'contact'>> & { contact?: ResumeContact };

// ============================================================================
// Evaluation Types
// ============================================================================

/** Evaluation result from deterministic scoring */
export interface EvaluationResult {
  score: number;
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
}

/** Candidate metadata for evaluation */
export interface CandidateMeta {
  selfReportedYearsExperience?: number;
}

// ============================================================================
// File Types
// ============================================================================

/** Strapi upload file interface */
export interface UploadFileLike {
  id: number;
  name: string;
  url: string;
  mime?: string;
  ext?: string;
  size?: number;
}
