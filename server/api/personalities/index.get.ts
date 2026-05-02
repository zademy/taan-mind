/**
 * GET /api/personalities
 *
 * Returns the current anonymous user's custom personalities only.
 * Built-in defaults stay in shared code and are intentionally excluded.
 */
export default defineEventHandler(async event => {
  const userId = getChatUserId(event)

  return await listCustomPersonalities(userId)
})
