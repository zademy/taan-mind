/**
 * @file Better Auth server-side configuration.
 *
 * Initializes the Better Auth instance with SQLite (Drizzle) storage,
 * email/password authentication, session management, and the admin plugin.
 * Used by all server-side auth checks and the catch-all API handler.
 */
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins'
import { db, schema } from 'hub:db'

/**
 * Resolves the auth secret from environment variables.
 * Fails fast in every environment if the secret is missing or too short.
 */
function getAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.NUXT_BETTER_AUTH_SECRET

  if (secret && secret.length >= 32) return secret

  if (!secret) {
    throw new Error(
      'BETTER_AUTH_SECRET must be set. Refusing to start without an explicit auth secret.'
    )
  }

  throw new Error('BETTER_AUTH_SECRET must be at least 32 characters.')
}

/**
 * Better Auth instance — the central auth configuration.
 *
 * - SQLite via Drizzle adapter (hub:db)
 * - Email/password login only (sign-up disabled — admin creates users)
 * - Sessions expire after 30 days, refreshed every 24 hours
 * - Admin plugin for role-based access (admin/user)
 */
export const auth = betterAuth({
  appName: 'Taan Mind',
  baseURL: process.env.BETTER_AUTH_URL,
  secret: getAuthSecret(),
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification
    }
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24
  },
  plugins: [
    admin({
      defaultRole: 'user',
      adminRoles: ['admin']
    })
  ]
})
