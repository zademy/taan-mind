import { z } from 'zod'
import { ensureOwnedChatShare, getOwnedChatOrThrow } from '../../../utils/chatShares'

/**
 * @file POST /api/chats/:id/share
 *
 * Creates a new live read-only share link for a chat owned by the current
 * session user. If an inactive share already exists it is reactivated with a
 * fresh token. Idempotent — calling twice returns the same active share.
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
    share: await ensureOwnedChatShare(event, chat)
  }
})
