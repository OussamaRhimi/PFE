// backend/src/api/department/controllers/department.js
import { factories } from '@strapi/strapi';

function normalizeName(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
}

export default factories.createCoreController('api::department.department', ({ strapi }) => ({
    async create(ctx) {
        const name = normalizeName(ctx.request.body?.data?.name);
        if (!name) {
            return ctx.badRequest('Le nom du département est requis.');
        }

        const existing = await strapi.entityService.findMany('api::department.department', {
            filters: { name: { $eqi: name } },
            fields: ['id', 'name'],
            limit: 1,
        } as any);
        if (Array.isArray(existing) && existing.length > 0) {
            return ctx.badRequest('Ce département existe déjà.');
        }

        ctx.request.body = {
            ...ctx.request.body,
            data: { ...(ctx.request.body?.data ?? {}), name },
        };
        return super.create(ctx);
    },

    async update(ctx) {
        const name = normalizeName(ctx.request.body?.data?.name);
        if (!name) {
            return ctx.badRequest('Le nom du département est requis.');
        }

        const documentId = String(ctx.params?.id ?? '');
        const existing = await strapi.entityService.findMany('api::department.department', {
            filters: { name: { $eqi: name } },
            fields: ['id', 'documentId', 'name'],
            limit: 2,
        } as any);
        const duplicate = Array.isArray(existing)
            ? existing.find((item: any) => String(item.documentId ?? '') !== documentId)
            : null;
        if (duplicate) {
            return ctx.badRequest('Ce département existe déjà.');
        }

        ctx.request.body = {
            ...ctx.request.body,
            data: { ...(ctx.request.body?.data ?? {}), name },
        };
        return super.update(ctx);
    },

    async search(ctx) {
        const { q, limit = '10' } = ctx.query;

        if (!q || String(q).trim() === '') {
            return ctx.badRequest('Le paramètre de recherche `q` est requis.');
        }

        // Conversion sécurisée de la limite
        const limitStr = String(limit);
        const limitNumber = parseInt(limitStr, 10);
        const safeLimit = isNaN(limitNumber) ? 10 : Math.min(limitNumber, 100);

        const results = await strapi.entityService.findMany('api::department.department', {
            filters: {
                name: { $containsi: String(q).trim() },
            },
            fields: ['id', 'name'],
            limit: safeLimit,
            sort: { name: 'asc' },
        });

        return ctx.send(results);
    },

    async find(ctx) {
        const { search } = ctx.query;
        if (search && String(search).trim() !== '') {
            const results = await strapi.entityService.findMany('api::department.department', {
                filters: { name: { $containsi: String(search).trim() } },
                fields: ['id', 'name'],
                sort: { name: 'asc' },
            });
            return this.transformResponse(results);
        }
        return super.find(ctx);
    },
}));
