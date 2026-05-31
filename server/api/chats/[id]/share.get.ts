import { z } from 'zod'
import { getOwnedChatOrThrow, getOwnedChatShare } from '../../../utils/chatShares'

/**
 * @file GET /api/chats/:id/share
 *
 * Returns the current read-only share-link status for a chat owned by the
 * current session user. Returns `{ share: null }` when the chat has no share.
 *
 * @routeParam id — The chat UUID.
 * @response `{ share: ChatShareResponse | null }`

 * @module server/api/chats
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
    share: await getOwnedChatShare(event, chat)
  }
})
