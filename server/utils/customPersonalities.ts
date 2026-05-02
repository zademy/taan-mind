import type { CustomPersonality } from '#shared/utils/personalities'
import { db, schema } from 'hub:db'
import { and, asc, eq } from 'drizzle-orm'
import {
  DEFAULT_PERSONALITY,
  getCustomPersonalityId,
  getPersonalityPrompt,
  isCustomPersonalityId,
  isDefaultPersonality,
  MAX_CUSTOM_PERSONALITIES
} from '#shared/utils/personalities'

type CustomPersonalityRow = typeof schema.customPersonalities.$inferSelect

/**
 * Serializes a DB custom personality row for the client API.
 *
 * @param row - Drizzle row from the custom personalities table.
 * @returns JSON-safe custom personality DTO.
 */
export function serializeCustomPersonality(row: CustomPersonalityRow): CustomPersonality {
  return {
    id: row.id,
    label: row.label,
    prompt: row.prompt,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

/**
 * Lists custom personalities owned by an anonymous user.
 *
 * @param userId - Session-derived user ID.
 * @returns Custom personalities ordered by creation date.
 */
export async function listCustomPersonalities(userId: string): Promise<CustomPersonality[]> {
  const rows = await db
    .select()
    .from(schema.customPersonalities)
    .where(eq(schema.customPersonalities.userId, userId))
    .orderBy(asc(schema.customPersonalities.createdAt))

  return rows.map(serializeCustomPersonality)
}

/**
 * Verifies a personality value can be used by the current user.
 *
 * @param personality - Default ID or `custom:<uuid>` value.
 * @param userId - Session-derived user ID.
 * @returns The validated personality value.
 * @throws 400 when the personality value is invalid or unavailable.
 */
export async function assertPersonalityAvailable(
  personality: string,
  userId: string
): Promise<string> {
  if (isDefaultPersonality(personality)) return personality

  if (!isCustomPersonalityId(personality)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid personality'
    })
  }

  const customId = getCustomPersonalityId(personality)
  const customPersonality = await db.query.customPersonalities.findFirst({
    where: () =>
      and(
        eq(schema.customPersonalities.id, customId),
        eq(schema.customPersonalities.userId, userId)
      )
  })

  if (!customPersonality) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Custom personality not found'
    })
  }

  return personality
}

/**
 * Resolves the system prompt for a stored chat personality.
 *
 * @param personality - Default ID or `custom:<uuid>` value from the chat.
 * @param userId - Session-derived user ID.
 * @returns Matching system prompt, falling back to the default prompt if stale.
 */
export async function resolvePersonalityPrompt(
  personality: string,
  userId: string
): Promise<string> {
  if (isDefaultPersonality(personality)) {
    return getPersonalityPrompt(personality)
  }

  if (isCustomPersonalityId(personality)) {
    const customId = getCustomPersonalityId(personality)
    const customPersonality = await db.query.customPersonalities.findFirst({
      where: () =>
        and(
          eq(schema.customPersonalities.id, customId),
          eq(schema.customPersonalities.userId, userId)
        )
    })

    if (customPersonality) return customPersonality.prompt
  }

  return getPersonalityPrompt(DEFAULT_PERSONALITY)
}

/**
 * Enforces the per-user custom personality quota.
 *
 * @param userId - Session-derived user ID.
 * @throws 400 when the user already has the maximum number of custom personalities.
 */
export async function assertCustomPersonalityQuota(userId: string): Promise<void> {
  const rows = await db
    .select({ id: schema.customPersonalities.id })
    .from(schema.customPersonalities)
    .where(eq(schema.customPersonalities.userId, userId))

  if (rows.length >= MAX_CUSTOM_PERSONALITIES) {
    throw createError({
      statusCode: 400,
      statusMessage: `You can only create ${MAX_CUSTOM_PERSONALITIES} custom personalities`
    })
  }
}
