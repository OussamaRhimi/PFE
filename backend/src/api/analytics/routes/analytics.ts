export default {
  routes: [
    {
      method: 'GET',
      path: '/hr/analytics',
      handler: 'analytics.get',
      config: { auth: false },
    },
  ],
};
