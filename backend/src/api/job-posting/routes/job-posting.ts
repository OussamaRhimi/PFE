import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::job-posting.job-posting', {
  config: {
    find:    { auth: false, policies: [] },
    findOne: { auth: false, policies: [] },
    create:  { auth: false, policies: [] },
    update:  { auth: false, policies: [] },
    delete:  { auth: false, policies: [] },
  },
});
