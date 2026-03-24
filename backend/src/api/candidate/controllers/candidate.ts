import { factories } from '@strapi/strapi';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

/** GDPR retention period: 24 months from consent date */
const RETENTION_MONTHS = 24;

/**
 * Allowed MIME types for resume upload.
 * Strapi's upload plugin handles the actual file, but we validate on our side too.
 */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE_MB = 5;
const TRACKING_CODE_TTL_MINUTES = 15;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function hashVerificationCode(email: string, code: string): string {
  const secret = process.env.TRACKING_CODE_SECRET || '';
  return crypto.createHash('sha256').update(`${email}:${code}:${secret}`).digest('hex');
}

async function sendVerificationCodeEmail(email: string, code: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !from) {
    strapi.log.warn(`SMTP_HOST and SMTP_FROM are not configured. SIMULATING email to ${email} with code ${code}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Your application tracking verification code',
    text: `Your verification code is ${code}. It expires in ${TRACKING_CODE_TTL_MINUTES} minutes.`,
    html: `
      <p>Your verification code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
      <p>This code expires in ${TRACKING_CODE_TTL_MINUTES} minutes.</p>
    `,
  });
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export default factories.createCoreController('api::candidate.candidate', ({ strapi }) => ({
  //  GET /api/candidates/by-job/:documentId   (public)
  //  Return candidates linked to a job posting (by documentId)
// src/api/candidate/controllers/candidate.ts

async findByJob(ctx) {
  const { documentId } = ctx.params;

  // On récupère les résultats via le Document Service
  const entities = await strapi.documents('api::candidate.candidate').findMany({
    filters: {
      job_posting: {
        documentId: documentId
      }
    },
    ...ctx.query // On garde la pagination et le tri d'Angular
  });

  return this.transformResponse(entities);
},
  // ─────────────────────────────────────────────────────────────
  //  POST /api/candidates/apply   (public – multipart/form-data)
  //  US2 – candidate creation with resume upload + file validation
  //  US3 – consent + consentAt + retentionUntil auto-calculation
  //  US4 – publicToken generation
  // ─────────────────────────────────────────────────────────────
  async apply(ctx) {
    const { body, files } = ctx.request as any;

    // ── Required fields validation ──
    const {
      fullName, email, jobPostingId, consent,
      linkedin, portfolio, candidateNotes, selfReportedYearsExperience,
    } = body;

    if (!fullName?.trim() || !email?.trim()) {
      return ctx.badRequest('fullName and email are required.');
    }

    if (!jobPostingId) {
      return ctx.badRequest('jobPostingId is required.');
    }

    // ── Consent validation (US3) ──
    if (consent !== 'true' && consent !== true) {
      return ctx.badRequest('You must give consent to proceed (GDPR).');
    }

    // ── Verify job posting exists and is open ──
    const jobPosting = await strapi.documents('api::job-posting.job-posting').findOne({
      documentId: jobPostingId,
    });
    if (!jobPosting) {
      return ctx.notFound('Job posting not found.');
    }
    if (jobPosting.status !== 'open') {
      return ctx.badRequest('This job posting is not accepting applications.');
    }

    // ── File validation (US2) ──
    console.log('--- UPLOADED FILES ---');
    console.log(files);
    console.log('----------------------');

    const rawResumeFile = files?.resume;
    if (!rawResumeFile) {
      return ctx.badRequest('A resume file is required.');
    }

    const resumeFile = Array.isArray(rawResumeFile) ? rawResumeFile[0] : rawResumeFile;
    const mimeType = resumeFile.type || resumeFile.mimetype;

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return ctx.badRequest(
        `Invalid file type "${mimeType}". Allowed: PDF, DOC, DOCX.`
      );
    }

    const fileSizeMB = resumeFile.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      return ctx.badRequest(
        `File too large (${fileSizeMB.toFixed(1)} MB). Maximum: ${MAX_FILE_SIZE_MB} MB.`
      );
    }

    // ── Upload the file via Strapi upload plugin ──
    const uploadedFiles = await strapi.plugin('upload').service('upload').upload({
      data: { fileInfo: { name: resumeFile.name || resumeFile.originalFilename } },
      files: resumeFile,
    });
    const uploadedFile = uploadedFiles[0];

    // ── Build candidate data ──
    const now = new Date();
    const publicToken = generateToken();
    const retentionUntil = addMonths(now, RETENTION_MONTHS);

    const yearsExp = selfReportedYearsExperience
      ? parseInt(selfReportedYearsExperience, 10) || null
      : null;

    const candidate = await strapi.documents('api::candidate.candidate').create({
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        linkedin: linkedin?.trim() || null,
        portfolio: portfolio?.trim() || null,
        candidateNotes: candidateNotes?.trim() || null,
        selfReportedYearsExperience: yearsExp,
        job_posting: jobPostingId,
        status: 'new',
        score: 0,
        consent: true,
        consentAt: now.toISOString(),
        retentionUntil: retentionUntil.toISOString(),
        publicToken,
        resume: uploadedFile.id,
      },
    });

    // Return only public-safe data + publicToken
    return ctx.send({
      data: {
        publicToken: candidate.publicToken,
        fullName: candidate.fullName,
        email: candidate.email,
        status: candidate.status,
        createdAt: candidate.createdAt,
      },
    });
  },

  // ─────────────────────────────────────────────────────────────
  //  POST /api/candidates/track/request-code   (public)
  //  US4 – generate and send email verification code by SMTP
  // ─────────────────────────────────────────────────────────────
  async requestTrackingCode(ctx) {
    const rawEmail = (ctx.request.body as any)?.email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return ctx.badRequest('Email is required.');
    }

    const email = normalizeEmail(rawEmail);
    if (!EMAIL_REGEX.test(email)) {
      return ctx.badRequest('A valid email is required.');
    }

    const candidates = await strapi.documents('api::candidate.candidate').findMany({
      filters: { email: { $eq: email } },
    });

    // Always return a generic success message to avoid leaking whether the email exists.
    if (!candidates || candidates.length === 0) {
      return ctx.send({
        data: {
          message: 'If this email has applications, a verification code has been sent.',
        },
      });
    }

    const code = generateVerificationCode();
    const codeHash = hashVerificationCode(email, code);
    const expiresAt = new Date(Date.now() + TRACKING_CODE_TTL_MINUTES * 60 * 1000).toISOString();

    await Promise.all(
      candidates.map((candidate) =>
        strapi.documents('api::candidate.candidate').update({
          documentId: candidate.documentId,
          data: {
            trackingCodeHash: codeHash,
            trackingCodeExpiresAt: expiresAt,
          } as any,
        })
      )
    );

    try {
      await sendVerificationCodeEmail(email, code);
    } catch (error) {
      strapi.log.error(`US4 requestTrackingCode email send failed for ${email}: ${(error as Error).message}`);
      return ctx.internalServerError('Unable to send verification code email at the moment.');
    }

    return ctx.send({
      data: {
        message: 'If this email has applications, a verification code has been sent.',
      },
    });
  },

  // ─────────────────────────────────────────────────────────────
  //  POST /api/candidates/track/verify-code   (public)
  //  US4 – verify email code and return candidate applications list
  // ─────────────────────────────────────────────────────────────
  async verifyTrackingCode(ctx) {
    const rawEmail = (ctx.request.body as any)?.email;
    const rawCode = (ctx.request.body as any)?.code;

    if (!rawEmail || typeof rawEmail !== 'string') {
      return ctx.badRequest('Email is required.');
    }
    if (!rawCode || typeof rawCode !== 'string') {
      return ctx.badRequest('Verification code is required.');
    }

    const email = normalizeEmail(rawEmail);
    const code = rawCode.trim();

    if (!EMAIL_REGEX.test(email)) {
      return ctx.badRequest('A valid email is required.');
    }
    if (!/^\d{6}$/.test(code)) {
      return ctx.badRequest('Verification code must be a 6-digit number.');
    }

    const nowIso = new Date().toISOString();
    const codeHash = hashVerificationCode(email, code);

    const candidates = await strapi.documents('api::candidate.candidate').findMany({
      filters: {
        email: { $eq: email },
        trackingCodeHash: { $eq: codeHash },
        trackingCodeExpiresAt: { $gte: nowIso },
      },
      populate: ['job_posting'],
    });

    if (!candidates || candidates.length === 0) {
      return ctx.badRequest('Invalid or expired verification code.');
    }

    // One-time code: clear tracking code fields after successful verification.
    await Promise.all(
      candidates.map((candidate) =>
        strapi.documents('api::candidate.candidate').update({
          documentId: candidate.documentId,
          data: {
            trackingCodeHash: null,
            trackingCodeExpiresAt: null,
          } as any,
        })
      )
    );

    const applications = candidates.map((candidate) => ({
      publicToken: candidate.publicToken,
      status: candidate.status,
      jobTitle: (candidate as any).job_posting?.title || null,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      retentionUntil: (candidate as any).retentionUntil,
    }));

    return ctx.send({
      data: {
        email,
        applications,
      },
    });
  },

  // ─────────────────────────────────────────────────────────────
  //  GET /api/candidates/track/:token   (public)
  //  US4 – tracking endpoint: returns application status by token
  // ─────────────────────────────────────────────────────────────
  async track(ctx) {
    const { token } = ctx.params;

    if (!token) {
      return ctx.badRequest('Tracking token is required.');
    }

    const results = await strapi.documents('api::candidate.candidate').findMany({
      filters: { publicToken: { $eq: token } },
      populate: ['job_posting'],
    });

    if (!results || results.length === 0) {
      return ctx.notFound('No application found for this tracking token.');
    }

    const candidate = results[0];

    return ctx.send({
      data: {
        fullName: candidate.fullName,
        email: candidate.email,
        status: candidate.status,
        score: candidate.score,
        jobTitle: (candidate as any).job_posting?.title || null,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
        retentionUntil: (candidate as any).retentionUntil,
      },
    });
  },

  // ─────────────────────────────────────────────────────────────
  //  DELETE /api/candidates/withdraw/:token   (public)
  //  US5 – GDPR self-service delete-by-token
  // ─────────────────────────────────────────────────────────────
  async withdraw(ctx) {
    const { token } = ctx.params;

    if (!token) {
      return ctx.badRequest('Tracking token is required.');
    }

    const results = await strapi.documents('api::candidate.candidate').findMany({
      filters: { publicToken: { $eq: token } },
      populate: ['resume'],
    });

    if (!results || results.length === 0) {
      return ctx.notFound('No application found for this tracking token.');
    }

    const candidate = results[0];

    // Delete attached resume file if exists
    if ((candidate as any).resume?.id) {
      try {
        await strapi.plugin('upload').service('upload').remove(
          (candidate as any).resume
        );
      } catch {
        // file might already be gone – continue
      }
    }

    // Delete the candidate record
    await strapi.documents('api::candidate.candidate').delete({
      documentId: candidate.documentId,
    });

    return ctx.send({
      data: { message: 'Your application and all associated data have been deleted.' },
    });
  },
}));
