import { db, schema } from 'hub:db'
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
 * POST /api/personalities
 *
 * Creates one custom markdown personality for the current anonymous user.
 * Enforces the server-side max of three custom personalities per user.
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)
  const body = await readValidatedBody(event, customPersonalityBodySchema.parse)

  await assertCustomPersonalityQuota(userId)

  const [personality] = await db
    .insert(schema.customPersonalities)
    .values({
      userId,
      label: body.label,
      prompt: body.prompt,
      updatedAt: new Date()
    })
    .returning()

  if (!personality) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Could not create custom personality'
    })
  }

  return serializeCustomPersonality(personality)
})
