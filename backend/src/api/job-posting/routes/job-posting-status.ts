export default {
  routes: [
    {
      method: 'GET',
      path: '/job-postings/public',
      handler: 'job-posting.findOpen',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Public endpoint – returns only open job postings',
      },
    },
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
