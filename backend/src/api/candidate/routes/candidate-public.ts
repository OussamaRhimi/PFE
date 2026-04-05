export default {
  routes: [
    // ── S3-US6: CV Templates catalog ──
    {
      method: 'GET',
      path: '/cv-templates',
      handler: 'candidate.listCvTemplates',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'List all available CV templates',
      },
    },
    {
      method: 'GET',
      path: '/cv-templates/preview',
      handler: 'candidate.previewCvTemplate',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Get a rendered preview for a CV template key',
      },
    },
    {
      method: 'GET',
      path: '/cv-templates/default',
      handler: 'candidate.getDefaultCvTemplate',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Get the default CV template key',
      },
    },
    {
      method: 'PUT',
      path: '/cv-templates/default',
      handler: 'candidate.setDefaultCvTemplate',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Set the default CV template key',
      },
    },
    // ── S3-US6: Update candidate CV template ──
    {
      method: 'PUT',
      path: '/candidates/:id/template',
      handler: 'candidate.updateTemplate',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'HR endpoint – update candidate CV template selection',
      },
    },
    // ── S3-US7: Download CV as PDF ──
    {
      method: 'GET',
      path: '/candidates/:id/cv-pdf',
      handler: 'candidate.downloadCvPdf',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Download standardized CV as PDF (HR or public token)',
      },
    },
    // ── S3-US8: Reprocess candidate ──
    {
      method: 'PUT',
      path: '/candidates/:id/reprocess',
      handler: 'candidate.reprocess',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'HR endpoint – reset and re-trigger AI pipeline',
      },
    },
    // ── S3-US5: CV Preview ──
    {
      method: 'GET',
      path: '/candidates/:id/cv-preview',
      handler: 'candidate.getCvPreview',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'HR endpoint – get CV preview data',
      },
    },
    // ── S3-US1: Manual process trigger ──
    {
      method: 'POST',
      path: '/candidates/:id/process',
      handler: 'candidate.triggerProcess',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'HR endpoint – manually trigger AI processing',
      },
    },
    // ── S2-US6: HR candidate listing with pagination ──
    {
      method: 'GET',
      path: '/candidates/hr',
      handler: 'candidate.listForHr',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'HR endpoint – list candidates with pagination',
      },
    },
    // ── S2-US7: HR candidate detail & resume download ──
    {
      method: 'GET',
      path: '/candidates/hr/:id/resume',
      handler: 'candidate.downloadResume',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'HR endpoint – download candidate resume',
      },
    },
    {
      method: 'GET',
      path: '/candidates/hr/:id',
      handler: 'candidate.getDetail',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'HR endpoint – candidate detail',
      },
    },
    // ── S2-US8: HR status update with transition validation ──
    {
      method: 'PUT',
      path: '/candidates/hr/:id/status',
      handler: 'candidate.updateStatus',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'HR endpoint – update candidate status with transition validation',
      },
    },
    // ── S2-US9: HR notes update ──
    {
      method: 'PUT',
      path: '/candidates/hr/:id/notes',
      handler: 'candidate.updateHrNotes',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'HR endpoint – update HR notes for candidate',
      },
    },

    {
      method: 'GET',
      path: '/candidates/by-job/:documentId',
      handler: 'api::candidate.candidate.findByJob',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Public endpoint - list candidates by job posting documentId',
      },
    },
    {
      method: 'GET',
      path: '/candidates/detail/:documentId',
      handler: 'api::candidate.candidate.findDetail',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Public endpoint - get candidate detail with relations',
      },
    },
    {
      method: 'POST',
      path: '/candidates/track/request-code',
      handler: 'api::candidate.candidate.requestTrackingCode',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Public endpoint - send email verification code for application tracking',
      },
    },
    {
      method: 'POST',
      path: '/candidates/track/verify-code',
      handler: 'api::candidate.candidate.verifyTrackingCode',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Public endpoint - verify tracking email code and list applications',
      },
    },
    {
      method: 'POST',
      path: '/candidates/apply',
      handler: 'api::candidate.candidate.apply',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Public endpoint - submit a job application with resume upload',
      },
    },
    {
      method: 'GET',
      path: '/candidates/track/:token',
      handler: 'api::candidate.candidate.track',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Public endpoint - track application status by token',
      },
    },
    {
      method: 'DELETE',
      path: '/candidates/withdraw/:token',
      handler: 'api::candidate.candidate.withdraw',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Public GDPR endpoint - delete application and data by token',
      },
    },
  ],
};
