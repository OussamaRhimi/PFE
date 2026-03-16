export default {
  routes: [
    // ── S2-US7: HR candidate detail & resume download (JWT required) ──
    {
      method: 'GET',
      path: '/candidates/hr/:id/resume',
      handler: 'candidate.downloadResume',
      config: {
        auth: { scope: [] },
        policies: [],
        middlewares: [],
        description: 'HR endpoint – download candidate resume (JWT required)',
      },
    },
    {
      method: 'GET',
      path: '/candidates/hr/:id',
      handler: 'candidate.getDetail',
      config: {
        auth: { scope: [] },
        policies: [],
        middlewares: [],
        description: 'HR endpoint – candidate detail (JWT required)',
      },
    },

    {
      method: 'POST',
      path: '/candidates/track/request-code',
      handler: 'candidate.requestTrackingCode',
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
      handler: 'candidate.verifyTrackingCode',
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
      handler: 'candidate.apply',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Public endpoint – submit a job application with resume upload',
      },
    },
    {
      method: 'GET',
      path: '/candidates/track/:token',
      handler: 'candidate.track',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Public endpoint – track application status by token',
      },
    },
    {
      method: 'DELETE',
      path: '/candidates/withdraw/:token',
      handler: 'candidate.withdraw',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Public GDPR endpoint – delete application and data by token',
      },
    },
  ],
};
