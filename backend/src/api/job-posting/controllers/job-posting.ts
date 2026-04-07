import { factories } from '@strapi/strapi';
import { DEFAULT_EVALUATION_CONFIG, mergeEvaluationConfig } from '../../../utils/candidate-ai';


const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['open'],
  open: ['closed'],
  closed: ['open'],
};

export default factories.createCoreController('api::job-posting.job-posting', ({ strapi }) => ({
  async publicList(ctx) {
    const items = await strapi.entityService.findMany('api::job-posting.job-posting', {
      filters: { status: 'open' },
      fields: ['title', 'description', 'requirements'],
      sort: { createdAt: 'desc' },
    });

    ctx.body = (items ?? []).map((jp: any) => ({
      id: jp.id,
      title: jp.title ?? null,
      description: jp.description ?? null,
      requirements: jp.requirements ?? null,
    }));
  },

  async publicFindOne(ctx) {
    const rawId = String(ctx.params?.id ?? '').trim();
    if (!rawId) return ctx.badRequest('Invalid id');

    const numericId = Number(rawId);
    let jp: any | null = null;

    if (Number.isFinite(numericId)) {
      jp = await strapi.entityService.findOne('api::job-posting.job-posting', numericId, {
        fields: ['title', 'description', 'status', 'requirements'],
      });
    } else {
      jp = await strapi.documents('api::job-posting.job-posting').findOne({
        documentId: rawId,
        fields: ['title', 'description', 'status', 'requirements'] as any,
      });
    }

    if (!jp || jp.status === 'closed' || jp.status === 'draft') return ctx.notFound();

    ctx.body = {
      id: jp.id ?? null,
      title: jp.title ?? null,
      description: jp.description ?? null,
      requirements: jp.requirements ?? null,
    };
  },

  /**
   * GET /api/job-postings/public
   * Returns only job postings with status "open" (no auth required).
   */
  async findOpen(ctx) {
    // Force-filter to status=open, merge with any extra qs the client sends
    ctx.query = {
      ...ctx.query,
      filters: { ...(ctx.query.filters as any || {}), status: { $eq: 'open' } },
    };

    // Delegate to the default Strapi find() so pagination & populate still work
    const result = await super.find(ctx);
    return result;
  },
  /**
   * PUT /api/job-postings/:id/status
   * Body: { status: "open" | "closed" | "draft" }
   */
  async changeStatus(ctx) {
    const { id } = ctx.params;
    const { status: newStatus } = ctx.request.body as { status: string };

    if (!newStatus) {
      return ctx.badRequest('Missing "status" in request body.');
    }

    // Fetch the current job posting
    const existing = await strapi.documents('api::job-posting.job-posting').findOne({
      documentId: id,
      populate: [],
    });

    if (!existing) {
      return ctx.notFound('Job posting not found.');
    }

    const currentStatus = existing.status as string;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      return ctx.badRequest(
        `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}.`
      );
    }

    const updated = await strapi.documents('api::job-posting.job-posting').update({
      documentId: id,
      data: { status: newStatus as 'draft' | 'open' | 'closed' },
    });

    return (this as any).transformResponse(updated);
  },

  async hrGetEvalConfig(ctx) {
    const rawId = String(ctx.params?.id ?? '').trim();
    if (!rawId) return ctx.badRequest('Invalid id');

    const numericId = Number(rawId);
    let jp: any | null = null;

    if (Number.isFinite(numericId)) {
      jp = await strapi.entityService.findOne('api::job-posting.job-posting', numericId, {
        fields: ['requirements'] as any,
      });
    } else {
      jp = await strapi.documents('api::job-posting.job-posting').findOne({
        documentId: rawId,
        fields: ['requirements'] as any,
      });
    }

    if (!jp) return ctx.notFound();

    const raw = jp.requirements?.evaluationConfig ?? null;
    ctx.body = { evaluationConfig: mergeEvaluationConfig(raw), defaults: DEFAULT_EVALUATION_CONFIG };
  },

  async hrSetEvalConfig(ctx) {
    const rawId = String(ctx.params?.id ?? '').trim();
    if (!rawId) return ctx.badRequest('Invalid id');

    const body = (ctx.request as any).body ?? {};
    const incoming = body.evaluationConfig;
    if (!incoming || typeof incoming !== 'object') return ctx.badRequest('evaluationConfig object is required.');

    const numericId = Number(rawId);
    let jp: any | null = null;

    if (Number.isFinite(numericId)) {
      jp = await strapi.entityService.findOne('api::job-posting.job-posting', numericId, {
        fields: ['requirements'] as any,
      });
    } else {
      jp = await strapi.documents('api::job-posting.job-posting').findOne({
        documentId: rawId,
        fields: ['requirements'] as any,
      });
    }

    if (!jp) return ctx.notFound();

    const validated = mergeEvaluationConfig(incoming);
    const requirements = { ...(jp.requirements ?? {}), evaluationConfig: validated };

    if (Number.isFinite(numericId)) {
      await strapi.entityService.update('api::job-posting.job-posting', numericId, {
        data: { requirements } as any,
      });
    } else {
      await strapi.documents('api::job-posting.job-posting').update({
        documentId: rawId,
        data: { requirements } as any,
      });
    }

    ctx.body = { ok: true, evaluationConfig: validated };
  },
}));
