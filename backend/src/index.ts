import type { Core } from '@strapi/strapi';

export default {
  /**
   * Register phase – runs before the app is initialised.
   * Use this to extend Strapi's internal services or register
   * custom GraphQL types / middleware, etc.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    // nothing extra for now
  },

  /**
   * Bootstrap phase – runs once the app is ready but before
   * it starts listening. Good for seeding data & configuring
   * default permissions on the Users & Permissions plugin.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // ── Ensure the "public" role has minimal read-only access ───────
    await configurePublicRole(strapi);
  },
};

/* ------------------------------------------------------------------ */
/*  Helper: lock-down the public role to read-only on safe endpoints  */
/* ------------------------------------------------------------------ */
async function configurePublicRole(strapi: Core.Strapi) {
  const pluginStore = strapi.store({
    type: 'plugin',
    name: 'users-permissions',
  });

  // Only run the seed once (idempotent flag)
  const isInitialised = await pluginStore.get({ key: 'permissions_seeded' });
  if (isInitialised) return;

  // Retrieve the Public role
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) return;

  // Grant only auth-related public endpoints (register, login, callback)
  const permissions = await strapi
    .query('plugin::users-permissions.permission')
    .findMany({ where: { role: publicRole.id } });

  // Enable auth actions that should be public
  const publicActions = [
    'plugin::users-permissions.auth.callback',
    'plugin::users-permissions.auth.connect',
    'plugin::users-permissions.auth.register',
    'plugin::users-permissions.auth.forgotPassword',
    'plugin::users-permissions.auth.resetPassword',
    'plugin::users-permissions.auth.emailConfirmation',
  ];

  for (const perm of permissions) {
    const shouldEnable = publicActions.includes(perm.action);
    if (perm.enabled !== shouldEnable) {
      await strapi
        .query('plugin::users-permissions.permission')
        .update({
          where: { id: perm.id },
          data: { enabled: shouldEnable },
        });
    }
  }

  await pluginStore.set({ key: 'permissions_seeded', value: true });
  strapi.log.info('✔  Public-role permissions seeded (auth-only).');
}
