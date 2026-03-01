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
    // ── Ensure the "authenticated" role can CRUD skills ────────────
    await configureAuthenticatedRole(strapi);
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

/* ------------------------------------------------------------------ */
/*  Helper: grant Authenticated role full CRUD on Skills              */
/* ------------------------------------------------------------------ */
async function configureAuthenticatedRole(strapi: Core.Strapi) {
  const pluginStore = strapi.store({
    type: 'plugin',
    name: 'users-permissions',
  });

  // Only run once
  const isSeeded = await pluginStore.get({ key: 'authenticated_permissions_seeded_v2' });
  if (isSeeded) return;

  // Find the Authenticated role
  const authRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } });

  if (!authRole) return;

  // Skill actions to enable for authenticated users
  const actionsToEnable = [
    // Skills
    'api::skill.skill.find',
    'api::skill.skill.findOne',
    'api::skill.skill.create',
    'api::skill.skill.update',
    'api::skill.skill.delete',
    // Departments
    'api::department.department.find',
    'api::department.department.findOne',
    'api::department.department.create',
    'api::department.department.update',
    'api::department.department.delete',
    // Job Postings
    'api::job-posting.job-posting.find',
    'api::job-posting.job-posting.findOne',
    'api::job-posting.job-posting.create',
    'api::job-posting.job-posting.update',
    'api::job-posting.job-posting.delete',
    'api::job-posting.job-posting.changeStatus',
  ];

  // Get all permissions for the authenticated role
  const permissions = await strapi
    .query('plugin::users-permissions.permission')
    .findMany({ where: { role: authRole.id } });

  for (const action of actionsToEnable) {
    const existing = permissions.find((p: any) => p.action === action);
    if (existing) {
      // Enable if not already
      if (!existing.enabled) {
        await strapi
          .query('plugin::users-permissions.permission')
          .update({ where: { id: existing.id }, data: { enabled: true } });
      }
    } else {
      // Create the permission
      await strapi
        .query('plugin::users-permissions.permission')
        .create({
          data: {
            action,
            role: authRole.id,
            enabled: true,
          },
        });
    }
  }

  await pluginStore.set({ key: 'authenticated_permissions_seeded_v2', value: true });
  strapi.log.info('✔  Authenticated-role permissions seeded (skills, departments, job-postings).');
}
