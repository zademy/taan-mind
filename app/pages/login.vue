<!--
  login.vue - Authentication sign-in page

  Provides a standalone email/password login form (no default layout).
  Supports a redirect query parameter to send users back to their original
  destination after successful authentication. On first sign-in, the page
  attempts to claim any legacy anonymous session data into the new account.
-->
<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { z } from 'zod'
import { authClient } from '~/utils/auth-client'

/** Disables the default sidebar layout — login uses its own full-page shell. */
definePageMeta({
  layout: false
})

const route = useRoute()
const toast = useToast()
const { csrf, headerName } = useCsrf()

/**
 * Zod schema for login form validation.
 * Requires a valid email and a non-empty password.
 */
const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.')
})

type LoginSchema = z.output<typeof schema>

/** Field definitions consumed by the UAuthForm component. */
const fields: AuthFormField[] = [
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'admin@example.com',
    autocomplete: 'email',
    required: true
  },
  {
    name: 'password',
    type: 'password',
    label: 'Password',
    placeholder: 'Enter your password',
    autocomplete: 'current-password',
    required: true
  }
]

/** Tracks whether the sign-in request is in progress to prevent double-submits. */
const loading = ref(false)

/**
 * Sanitizes a redirect path to prevent open-redirect vulnerabilities.
 *
 * Only allows relative paths starting with `/` that are not protocol-relative.
 * Rejects the login route itself to avoid redirect loops.
 *
 * @param value - The raw redirect value from the query string.
 * @returns A safe redirect path (defaults to `/`).
 */
function getSafeRedirectPath(value: unknown) {
  if (typeof value !== 'string') return '/'
  if (!value.startsWith('/') || value.startsWith('//')) return '/'
  if (value === '/login' || value.startsWith('/login?')) return '/'
  return value
}

/**
 * Extracts a user-facing error message from a Better Auth sign-in error.
 *
 * @param error - The unknown error returned by the auth client.
 * @returns A human-readable error string for the toast notification.
 */
function getAuthErrorMessage(error: unknown) {
  return (
    (error as { message?: string })?.message ||
    (error as { statusText?: string })?.statusText ||
    'Unable to sign in with those credentials.'
  )
}

/**
 * Attempts to migrate legacy anonymous session data into the newly
 * authenticated user account. Failures are silently ignored because
 * this is a best-effort migration — it must never block login.
 */
async function claimAnonymousData() {
  try {
    await $fetch('/api/account/claim-anonymous', {
      method: 'POST',
      headers: { [headerName]: csrf }
    })
  } catch {
    // Claiming old anonymous data is best-effort and must not block login.
  }
}

/**
 * Handles form submission: authenticates via Better Auth, claims legacy
 * anonymous data, refreshes the Nuxt data cache, and redirects to the
 * originally requested page (or home).
 *
 * @param event - The validated form submit event from UAuthForm.
 */
async function onSubmit(event: FormSubmitEvent<LoginSchema>) {
  if (loading.value) return

  loading.value = true

  try {
    const { error } = await authClient.signIn.email({
      email: event.data.email,
      password: event.data.password,
      rememberMe: true
    })

    if (error) {
      toast.add({
        description: getAuthErrorMessage(error),
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
      return
    }

    await claimAnonymousData()
    await refreshNuxtData()
    await navigateTo(getSafeRedirectPath(route.query.redirect), { replace: true })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="min-h-dvh bg-default text-default">
    <div class="relative min-h-dvh overflow-hidden">
      <!-- Decorative background blurs -->
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute -top-32 -right-24 size-80 rounded-full bg-primary/10 blur-3xl" />
        <div class="absolute -bottom-32 -left-24 size-80 rounded-full bg-info/10 blur-3xl" />
      </div>

      <UContainer class="relative flex min-h-dvh items-center justify-center py-12">
        <div class="w-full max-w-md space-y-8">
          <!-- App branding -->
          <div class="flex flex-col items-center gap-3 text-center">
            <Logo class="size-16" />
            <div>
              <p class="text-sm font-medium text-muted">Taan Mind</p>
              <h1 class="text-3xl font-bold tracking-tight">Welcome back</h1>
            </div>
          </div>

          <!-- Sign-in form -->
          <UAuthForm
            :fields="fields"
            :schema="schema"
            :loading="loading"
            title="Sign in"
            description="Use the admin credentials configured for this app."
            icon="i-lucide-shield-check"
            :submit="{ label: 'Sign in', block: true }"
            class="rounded-2xl bg-default/80 p-6 ring ring-default/60 shadow-xl backdrop-blur"
            @submit="onSubmit"
          >
          </UAuthForm>
        </div>
      </UContainer>
    </div>
  </main>
</template>
