export default {
  routes: [
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
