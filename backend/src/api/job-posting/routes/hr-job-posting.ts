export default {
  routes: [
    {
      method: 'GET',
      path: '/hr/job-postings/:id/eval-config',
      handler: 'job-posting.hrGetEvalConfig',
      config: { auth: false },
    },
    {
      method: 'PUT',
      path: '/hr/job-postings/:id/eval-config',
      handler: 'job-posting.hrSetEvalConfig',
      config: { auth: false },
    },
  ],
};
