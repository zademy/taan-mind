import { z } from 'zod'
import { getOwnedChatOrThrow, revokeOwnedChatShare } from '../../../utils/chatShares'

/**
 * @file DELETE /api/chats/:id/share
 *
 * Revokes the active public read-only share link for a chat owned by the
 * current session user. If no share exists the response body contains
 * `{ share: null }`.
 *
 * @routeParam id — The chat UUID.
 * @response `{ share: ChatShareResponse | null }`
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
    share: await revokeOwnedChatShare(event, chat)
  }
})
