/**
 * @file Catch-all handler for Better Auth API routes.
 *
 * Delegates every request under /api/auth/* to the Better Auth handler,
 * which manages sign-in, sign-out, session, and account endpoints.
 */
import { auth } from '~~/server/utils/betterAuth'

export default defineEventHandler(event => auth.handler(toWebRequest(event)))
