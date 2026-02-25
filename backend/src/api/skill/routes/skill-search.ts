/**
 * Custom routes for the Skill API.
 * These are loaded alongside the core router (skill.ts).
 *
 * Route:  GET /api/skills/search?q=<term>&limit=<n>
 * Access: Public (configure in Admin → Settings → Roles → Public → Skill → search)
 */
export default {
    routes: [
        {
            method: 'GET',
            path: '/skills/search',
            handler: 'skill.search',   // maps to the `search` action in the controller
            config: {
                auth: false,             // publicly accessible – no JWT required
                policies: [],
                middlewares: [],
                description: 'Search skills by name (case-insensitive partial match)',
            },
        },
    ],
};
