/**
 * Custom route for department search.
 * Route: GET /api/departments/search?q=<term>&limit=<n>
 * Access: Public (auth: false)
 */
export default {
    routes: [
        {
            method: 'GET',
            path: '/departments/search',
            handler: 'department.search',
            config: {
                auth: false,
                policies: [],
                middlewares: [],
                description: 'Search departments by name (case-insensitive partial match)',
            },
        },
    ],
};
