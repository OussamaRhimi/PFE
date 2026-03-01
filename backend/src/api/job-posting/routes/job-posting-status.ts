export default {
  routes: [
    {
      method: 'PUT',
      path: '/job-postings/:id/status',
      handler: 'job-posting.changeStatus',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Change job posting status with transition validation',
      },
    },
  ],
};
