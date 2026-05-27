/**
 * @file First-run admin bootstrap plugin.
 *
 * On server startup, reads NUXT_AUTH_ADMIN_EMAIL, NUXT_AUTH_ADMIN_PASSWORD,
 * and NUXT_AUTH_ADMIN_NAME from the environment. If valid and no admin user
 * exists with that email, creates one via Better Auth and grants the admin role.
 *
 * In production with zero users and no credentials configured, the server
 * will fail to start as a safety measure.
 */
import { db, schema } from 'hub:db'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '~~/server/utils/betterAuth'

/** Minimum length enforced for the initial admin password. */
const MIN_ADMIN_PASSWORD_LENGTH = 12

type InitialAdminCredentials = {
  email: string
  password: string
  name: string
}

/**
 * Reads and validates admin credentials from runtime config / env vars.
 *
 * @returns Parsed credentials, or null if neither email nor password is set.
 * @throws If email is invalid or password is too short.
 */
function readInitialAdminCredentials(): InitialAdminCredentials | null {
  const config = useRuntimeConfig()
  const email = String(config.authAdminEmail || process.env.NUXT_AUTH_ADMIN_EMAIL || '')
    .trim()
    .toLowerCase()
  const password = String(config.authAdminPassword || process.env.NUXT_AUTH_ADMIN_PASSWORD || '')
  const name = String(
    config.authAdminName || process.env.NUXT_AUTH_ADMIN_NAME || 'Taan Admin'
  ).trim()

  if (!email && !password) return null

  const parsedEmail = z.email().safeParse(email)
  if (!parsedEmail.success) {
    throw new Error('NUXT_AUTH_ADMIN_EMAIL must be a valid email address.')
  }

  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `NUXT_AUTH_ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`
    )
  }

  return {
    email,
    password,
    name: name || 'Taan Admin'
  }
}

/** Returns the total number of registered auth users. */
async function countAuthUsers() {
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(schema.user)
  return Number(result?.count ?? 0)
}

export default defineNitroPlugin(async () => {
  const credentials = readInitialAdminCredentials()
  const authUserCount = await countAuthUsers()

  // No credentials configured — require them in production when no users exist
  if (!credentials) {
    if (authUserCount === 0 && process.env.NODE_ENV === 'production') {
      throw new Error(
        'Initial admin is not configured. Set NUXT_AUTH_ADMIN_EMAIL and NUXT_AUTH_ADMIN_PASSWORD.'
      )
    }

    return
  }

  // Look up whether a user with the configured admin email already exists
  const [existingAdmin] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, credentials.email))
    .limit(1)

  // Existing user — promote to admin if not already
  if (existingAdmin) {
    if (existingAdmin.role !== 'admin') {
      await db
        .update(schema.user)
        .set({ role: 'admin', banned: false, updatedAt: new Date() })
        .where(eq(schema.user.id, existingAdmin.id))
    }

    return
  }

  // Create the admin user via Better Auth API
  const created = await auth.api.createUser({
    body: {
      email: credentials.email,
      password: credentials.password,
      name: credentials.name,
      role: 'admin'
    }
  })

  if (!created?.user?.id) {
    throw new Error('Failed to create initial admin user.')
  }

  // Mark the new user as verified and assign the admin role
  await db
    .update(schema.user)
    .set({ emailVerified: true, role: 'admin', banned: false, updatedAt: new Date() })
    .where(eq(schema.user.id, created.user.id))
})
