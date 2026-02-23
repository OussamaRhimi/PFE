import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  // ── Users & Permissions plugin ─────────────────────────────────
  'users-permissions': {
    config: {
      jwt: {
        secret: env('JWT_SECRET'),
        expiresIn: '7d',           // API-user token lifetime
      },
      ratelimit: {
        interval: 60000,           // 1 minute window
        max: 10,                   // max login / register attempts per window
      },
    },
  },
});

export default config;
