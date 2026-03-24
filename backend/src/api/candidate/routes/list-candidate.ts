export default {
  routes: [
    {
      method: 'GET',
      path: '/candidates/by-job/:documentId', 
      handler: 'api::candidate.candidate.findByJob', // Pointe vers ta fonction
      config: {
        auth: false, // Permet l'accès public si besoin
      },
    },
  ],
};