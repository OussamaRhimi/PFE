import { factories } from '@strapi/strapi';


const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['open'],
  open: ['closed'],
  closed: ['open'],
};

export default factories.createCoreController('api::job-posting.job-posting', ({ strapi }) => ({
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
}));
