/**
 * @file Better Auth client-side configuration.
 *
 * Exports the Vue-aware auth client along with convenience destructured
 * helpers (signIn, signOut, signUp, useSession) used across the app.
 */
import { createAuthClient } from 'better-auth/vue'
import { adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [adminClient()]
})

export const { signIn, signOut, signUp, useSession } = authClient
