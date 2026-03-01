// backend/src/api/department/controllers/department.js
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::department.department', ({ strapi }) => ({
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