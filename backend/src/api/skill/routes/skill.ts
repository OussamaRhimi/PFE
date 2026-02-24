import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::skill.skill', {
  config: {
    find: {
      policies: [],
    },
    findOne: {
      policies: [],
    },
    create: {
      policies: [],
    },
    update: {
      policies: [],
    },
    delete: {
      policies: [],
    },
  },
});