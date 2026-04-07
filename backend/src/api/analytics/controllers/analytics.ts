function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export default {
  async get(ctx) {
    const strapi = (globalThis as any).strapi;
    if (!strapi?.entityService) {
      ctx.status = 500;
      ctx.body = { error: 'Strapi entityService unavailable.' };
      return;
    }

    const candidateContentType = strapi.contentTypes['api::candidate.candidate'];
    const statuses = Array.isArray(candidateContentType?.attributes?.status?.enum)
      ? (candidateContentType.attributes.status.enum as string[])
      : [];

    const totals = {
      candidates: await strapi.entityService.count('api::candidate.candidate', {}),
      jobs: await strapi.entityService.count('api::job-posting.job-posting', {}),
      openJobs: await strapi.entityService.count('api::job-posting.job-posting', {
        filters: { status: 'open' } as any,
      }),
    };

    const statusCounts: Record<string, number> = {};
    for (const status of statuses) {
      statusCounts[status] = await strapi.entityService.count('api::candidate.candidate', {
        filters: { status } as any,
      });
    }

    const scoreBuckets = [
      { label: '0-49', min: 0, max: 49 },
      { label: '50-69', min: 50, max: 69 },
      { label: '70-84', min: 70, max: 84 },
      { label: '85-100', min: 85, max: 100 },
    ];

    const scoreCounts = await Promise.all(
      scoreBuckets.map((bucket) =>
        strapi.entityService.count('api::candidate.candidate', {
          filters: {
            score: {
              $notNull: true,
              $gte: bucket.min,
              $lte: bucket.max,
            },
          } as any,
        })
      )
    );

    const scoreDistribution = scoreBuckets.map((bucket, i) => ({
      ...bucket,
      count: scoreCounts[i],
    }));

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const recent = (await strapi.entityService.findMany('api::candidate.candidate', {
      fields: ['createdAt'] as any,
      filters: { createdAt: { $gte: start.toISOString() } } as any,
      sort: { createdAt: 'asc' } as any,
      limit: 5000,
    })) as any[];

    const monthlyBuckets: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      monthlyBuckets[monthKey(d)] = 0;
    }

    for (const row of recent ?? []) {
      const createdAt = typeof row?.createdAt === 'string' ? new Date(row.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) continue;
      const key = monthKey(new Date(Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), 1)));
      if (key in monthlyBuckets) monthlyBuckets[key] += 1;
    }

    const monthlyApplications = Object.entries(monthlyBuckets).map(([month, count]) => ({ month, count }));

    ctx.body = {
      totals,
      statusCounts,
      scoreBuckets: scoreDistribution,
      monthlyApplications,
    };
  },
};
