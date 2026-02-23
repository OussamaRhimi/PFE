import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  // ── Admin-panel authentication ─────────────────────────────────
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
    options: {
      expiresIn: '7d',             // admin session token lifetime
    },
  },
  // ── API-token salt (for Content API tokens) ────────────────────
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  // ── Transfer-token salt (import / export) ──────────────────────
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  // ── Encryption key used for secrets stored in DB ───────────────
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  // ── Feature flags ──────────────────────────────────────────────
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
});

export default config;
