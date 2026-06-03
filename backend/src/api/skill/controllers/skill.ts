import { factories } from '@strapi/strapi';

function normalizeName(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
}

export default factories.createCoreController('api::skill.skill', ({ strapi }) => ({
    async create(ctx) {
        const name = normalizeName(ctx.request.body?.data?.name);
        if (!name) {
            return ctx.badRequest('Le nom de la compétence est requis.');
        }

        const existing = await strapi.entityService.findMany('api::skill.skill', {
            filters: { name: { $eqi: name } },
            fields: ['id', 'name'],
            limit: 1,
        } as any);
        if (Array.isArray(existing) && existing.length > 0) {
            return ctx.badRequest('Cette compétence existe déjà.');
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
            return ctx.badRequest('Le nom de la compétence est requis.');
        }

        const documentId = String(ctx.params?.id ?? '');
        const existing = await strapi.entityService.findMany('api::skill.skill', {
            filters: { name: { $eqi: name } },
            fields: ['id', 'documentId', 'name'],
            limit: 2,
        } as any);
        const duplicate = Array.isArray(existing)
            ? existing.find((item: any) => String(item.documentId ?? '') !== documentId)
            : null;
        if (duplicate) {
            return ctx.badRequest('Cette compétence existe déjà.');
        }

        ctx.request.body = {
            ...ctx.request.body,
            data: { ...(ctx.request.body?.data ?? {}), name },
        };
        return super.update(ctx);
    },

    // Surcharge de la méthode find pour gérer la recherche
    async find(ctx) {
        const { search, q } = ctx.query; // accepte les deux noms de paramètres
        const searchTerm = search || q;

        // Si un terme de recherche est fourni, on filtre
        if (searchTerm && String(searchTerm).trim() !== '') {
            const results = await strapi.entityService.findMany('api::skill.skill', {
                filters: {
                    name: { $containsi: String(searchTerm).trim() },
                },
                fields: ['id', 'name'], // ne retourner que l'essentiel
                sort: { name: 'asc' },
                // vous pouvez aussi gérer la pagination si besoin
            });
            // Retourne au format standard Strapi
            return (this as any).transformResponse(results);
        }

        // Sinon, comportement normal (retourne toutes les compétences)
        return super.find(ctx);
    },

    // Vous pouvez garder l'endpoint dédié si vous voulez
    async search(ctx) {
        const { q, limit = '10' } = ctx.query;
        if (!q || String(q).trim() === '') {
            return ctx.badRequest('Le paramètre de recherche `q` est requis.');
        }
        const parsedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 100);
        const results = await strapi.entityService.findMany('api::skill.skill', {
            filters: { name: { $containsi: String(q).trim() } },
            fields: ['id', 'name'],
            pagination: { limit: parsedLimit },
            sort: { name: 'asc' },
        });
        return ctx.send(results);
    },
}));
