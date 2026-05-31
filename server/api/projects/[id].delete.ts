import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

/**
 * DELETE /api/projects/:id
 *
 * Deletes a user-owned project and all chats related to it.
 * Chats are deleted first because chats.project_id uses ON DELETE SET NULL.
 *
 * @module server/api/projects
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)
  const { projects, chats } = schema

  const { id } = await getValidatedRouterParams(
    event,
    z.object({
      id: z.string().min(1)
    }).parse
  )

  const { activeChatId } = await getValidatedQuery(
    event,
    z.object({
      activeChatId: z.string().optional()
    }).parse
  )

  const project = await db.query.projects.findFirst({
    where: () => and(eq(projects.id, id), eq(projects.userId, userId))
  })

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const activeChatDeleted = activeChatId
    ? Boolean(
        await db.query.chats.findFirst({
          where: () =>
            and(eq(chats.id, activeChatId), eq(chats.projectId, id), eq(chats.userId, userId))
        })
      )
    : false

  const deletedChats = await db
    .delete(chats)
    .where(and(eq(chats.projectId, id), eq(chats.userId, userId)))
    .returning({ id: chats.id })

  const [deletedProject] = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning({
      id: projects.id,
      name: projects.name
    })

  return {
    project: deletedProject ?? { id: project.id, name: project.name },
    deletedChatCount: deletedChats.length,
    activeChatDeleted
  }
})
