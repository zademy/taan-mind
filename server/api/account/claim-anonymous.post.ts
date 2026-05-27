/**
 * @file Claim anonymous data into an authenticated account.
 *
 * POST /api/account/claim-anonymous
 *
 * When a user signs in for the first time, this endpoint migrates all
 * data created under their legacy anonymous cookie (paperless_chat_session)
 * to their new Better Auth user ID. This includes chats, projects,
 * custom personalities, and chat shares.
 *
 * After migration, the anonymous cookie is deleted.
 */
import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async event => {
  const session = await requireAuthSession(event)
  const legacyUserId = getCookie(event, ANONYMOUS_CHAT_SESSION_COOKIE)

  // Nothing to migrate if no legacy cookie or it already matches the auth user
  if (!legacyUserId || legacyUserId === session.user.id) {
    return {
      migrated: false,
      chats: 0,
      projects: 0,
      personalities: 0,
      shares: 0
    }
  }

  // Migrate all anonymous data to the authenticated user in parallel
  const [migratedChats, migratedProjects, migratedPersonalities, migratedShares] =
    await Promise.all([
      db
        .update(schema.chats)
        .set({ userId: session.user.id })
        .where(eq(schema.chats.userId, legacyUserId))
        .returning({ id: schema.chats.id }),
      db
        .update(schema.projects)
        .set({ userId: session.user.id })
        .where(eq(schema.projects.userId, legacyUserId))
        .returning({ id: schema.projects.id }),
      db
        .update(schema.customPersonalities)
        .set({ userId: session.user.id, updatedAt: new Date() })
        .where(eq(schema.customPersonalities.userId, legacyUserId))
        .returning({ id: schema.customPersonalities.id }),
      db
        .update(schema.chatShares)
        .set({ ownerUserId: session.user.id })
        .where(eq(schema.chatShares.ownerUserId, legacyUserId))
        .returning({ id: schema.chatShares.id })
    ])

  // Remove the legacy cookie — migration is one-shot
  deleteCookie(event, ANONYMOUS_CHAT_SESSION_COOKIE, {
    path: '/'
  })

  return {
    migrated: true,
    chats: migratedChats.length,
    projects: migratedProjects.length,
    personalities: migratedPersonalities.length,
    shares: migratedShares.length
  }
})
