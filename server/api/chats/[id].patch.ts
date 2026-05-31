import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const chatRenameParamsSchema = z.object({
  id: z.string().min(1)
})

const chatRenameBodySchema = z.object({
  title: z
    .string()
    .trim()
    .transform(title => title.replace(/\s+/g, ' '))
    .pipe(
      z
        .string()
        .min(1, 'Chat title is required')
        .max(80, 'Chat title must be 80 characters or less')
    )
})

/**
 * PATCH /api/chats/:id
 *
 * Renames a chat owned by the authenticated user.
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)
  const { id } = await getValidatedRouterParams(event, chatRenameParamsSchema.parse)
  const { title } = await readValidatedBody(event, chatRenameBodySchema.parse)

  const [chat] = await db
    .update(schema.chats)
    .set({
      title
    })
    .where(and(eq(schema.chats.id, id), eq(schema.chats.userId, userId)))
    .returning({
      id: schema.chats.id,
      title: schema.chats.title
    })

  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  return chat
})
