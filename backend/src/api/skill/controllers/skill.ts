import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::skill.skill', ({ strapi }) => ({
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