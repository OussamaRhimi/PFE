import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::candidate.candidate', {
  config: {
    find:    { auth: false, policies: [] },
    findOne: { auth: false, policies: [] },
    create:  { auth: false, policies: [] },
    update:  { auth: false, policies: [] },
    delete:  { auth: false, policies: [] },
  },
});
