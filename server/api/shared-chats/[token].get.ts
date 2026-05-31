/**
 * Public Shared Chat — GET /api/shared-chats/:token
 *
 * Public, unauthenticated endpoint that returns the live read-only view
 * of a shared chat. No anonymous session cookie is created.
 *
 * Responses include `Cache-Control: no-store` and `X-Robots-Tag: noindex`
 * to prevent caching and indexing.
 *
 * @module server/api/shared-chats
 */
import { z } from 'zod'
import { getPublicSharedChatOrThrow } from '../../utils/chatShares'
import { isChatShareToken } from '../../utils/shareTokens'

export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')

  const { token } = await getValidatedRouterParams(
    event,
    z.object({
      token: z.string().refine(isChatShareToken, 'Invalid share token')
    }).parse
  )

  return await getPublicSharedChatOrThrow(token)
})
