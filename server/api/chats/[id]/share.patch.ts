import { z } from 'zod'
import { getOwnedChatOrThrow, rotateOwnedChatShare } from '../../../utils/chatShares'

/**
 * @file PATCH /api/chats/:id/share
 *
 * Rotates the live share token for a chat owned by the current session user.
 * The previous public URL is immediately invalidated and a new one is returned.
 * If no share exists yet, one is created automatically.
 *
 * @routeParam id — The chat UUID.
 * @response `{ share: ChatShareResponse }`
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)
  const { id } = await getValidatedRouterParams(
    event,
    z.object({
      id: z.string().min(1).max(128)
    }).parse
  )

  const chat = await getOwnedChatOrThrow(id, userId)

  return {
    share: await rotateOwnedChatShare(event, chat)
  }
})
