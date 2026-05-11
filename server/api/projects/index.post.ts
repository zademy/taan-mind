import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const MAX_PROJECT_NAME_LENGTH = 80

/**
 * POST /api/projects
 *
 * Creates a project and an empty starter chat so the user can begin working
 * inside the project immediately.
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)
  const { name, personality } = await readValidatedBody(
    event,
    z.object({
      name: z.string().trim().min(1).max(MAX_PROJECT_NAME_LENGTH),
      personality: z.string().default('friendly')
    }).parse
  )

  const validatedPersonality = await assertPersonalityAvailable(personality, userId)

  const [project] = await db
    .insert(schema.projects)
    .values({
      userId,
      name
    })
    .returning()

  if (!project) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create project' })
  }

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
    await db.delete(schema.projects).where(eq(schema.projects.id, project.id))
    throw createError({ statusCode: 500, statusMessage: 'Failed to create project chat' })
  }

  return { project, chat }
})
