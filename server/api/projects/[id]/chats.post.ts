import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

/**
 * POST /api/projects/:id/chats
 *
 * Creates a new empty chat within an existing user-owned project.
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse)
  const { personality } = await readValidatedBody(
    event,
    z.object({ personality: z.string().default('friendly') }).parse
  )

  const project = await db.query.projects.findFirst({
    where: () => and(eq(schema.projects.id, id as string), eq(schema.projects.userId, userId))
  })

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const validatedPersonality = await assertPersonalityAvailable(personality, userId)

  const [chat] = await db
    .insert(schema.chats)
    .values({
      title: '',
      userId,
      personality: validatedPersonality,
      projectId: project.id
    })
    .returning()

  if (!chat) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create project chat' })
  }

  return { project, chat }
})
