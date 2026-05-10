import { z } from 'zod'
import { getPublicSharedChatOrThrow } from '../../utils/chatShares'
import { isChatShareToken } from '../../utils/shareTokens'

/**
 * @file GET /api/shared-chats/:token
 *
 * Public, unauthenticated endpoint that returns the live read-only view of a
 * shared chat. It intentionally does **not** create or require an anonymous
 * chat session cookie. Responses are always served with `Cache-Control: no-store`
 * and `X-Robots-Tag: noindex, nofollow` to prevent caching and indexing.
 *
 * @routeParam token — The opaque share token (43-char base64url string).
 * @response `PublicSharedChatResponse`
 */
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
