export default {
  routes: [
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
