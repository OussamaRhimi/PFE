import { isCvTemplateKey } from '../../../utils/cv-templates';

const STORE_NAME = 'cv-templates';
const STORE_KEY_DEFAULT_TEMPLATE = 'defaultCvTemplateKey';

export default {
  async get(ctx) {
    const strapi = (globalThis as any).strapi;
    if (!strapi?.contentTypes) {
      ctx.status = 500;
      ctx.body = { error: 'Strapi contentTypes unavailable.' };
      return;
    }

    const jobPosting = strapi.contentTypes['api::job-posting.job-posting'];
    const candidate = strapi.contentTypes['api::candidate.candidate'];

    const jobPostingStatuses = jobPosting?.attributes?.status?.enum ?? [];
    const candidateStatuses = candidate?.attributes?.status?.enum ?? [];

    ctx.body = {
      jobPostingStatuses: Array.isArray(jobPostingStatuses) ? jobPostingStatuses : [],
      candidateStatuses: Array.isArray(candidateStatuses) ? candidateStatuses : [],
    };
  },

  async getDefaultTemplate(ctx) {
    const strapi = (globalThis as any).strapi;
    try {
      const store = strapi.store({ type: 'core', name: STORE_NAME });
      const val = await store.get({ key: STORE_KEY_DEFAULT_TEMPLATE });
      ctx.body = { templateKey: typeof val === 'string' && isCvTemplateKey(val) ? val : 'standard' };
    } catch {
      ctx.body = { templateKey: 'standard' };
    }
  },

  async setDefaultTemplate(ctx) {
    const strapi = (globalThis as any).strapi;
    const body = (ctx.request as any).body ?? {};
    const templateKey = typeof body.templateKey === 'string' ? body.templateKey.trim() : '';

    if (!templateKey || !isCvTemplateKey(templateKey)) {
      ctx.status = 400;
      ctx.body = { error: 'Invalid templateKey.' };
      return;
    }

    const store = strapi.store({ type: 'core', name: STORE_NAME });
    await store.set({ key: STORE_KEY_DEFAULT_TEMPLATE, value: templateKey });
    ctx.body = { ok: true, templateKey };
  },
};
