import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { MAX_CUSTOM_PERSONALITY_PROMPT_LENGTH } from '#shared/utils/personalities'

const customPersonalityBodySchema = z.object({
  label: z.string().trim().min(1).max(60),
  prompt: z
    .string()
    .max(MAX_CUSTOM_PERSONALITY_PROMPT_LENGTH)
    .transform(value => value.replace(/\r\n/g, '\n'))
    .refine(value => value.trim().length > 0, {
      message: 'Prompt is required'
    })
})

/**
 * PATCH /api/personalities/:id
 *
 * Updates a custom personality owned by the current anonymous user.
 * Built-in personalities are not stored here and cannot be edited.
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)
  const { id } = await getValidatedRouterParams(
    event,
    z.object({
      id: z.string().min(1)
    }).parse
  )
  const body = await readValidatedBody(event, customPersonalityBodySchema.parse)

  const [personality] = await db
    .update(schema.customPersonalities)
    .set({
      label: body.label,
      prompt: body.prompt,
      updatedAt: new Date()
    })
    .where(
      and(eq(schema.customPersonalities.id, id), eq(schema.customPersonalities.userId, userId))
    )
    .returning()

  if (!personality) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Custom personality not found'
    })
  }

  return serializeCustomPersonality(personality)
})
