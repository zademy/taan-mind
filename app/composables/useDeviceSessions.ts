import type { DeleteDeviceSessionsResult, DeviceSession } from '#shared/utils/deviceSessions'

/**
 * useDeviceSessions — Composable for fetching and revoking authenticated
 * Better Auth sessions associated with the current user.
 *
 * Sessions are tied to browser/device sign-ins and expire after 30 days of
 * inactivity. Revoking a session invalidates its token immediately on the
 * server, regardless of client-side cookie state.
 *
 * ```ts
 * const { devices, remove, removeOthers } = useDeviceSessions()
 * ```
 *
 * @module app/composables
 * @requires useCsrf — reads the CSRF token needed for DELETE mutations.
 */
export function useDeviceSessions() {
  const { csrf, headerName } = useCsrf()

  const {
    data: devices,
    refresh,
    status,
    error
  } = useFetch<DeviceSession[]>('/api/settings/devices', {
    key: 'settings-devices',
    default: () => []
  })

  /**
   * Revokes one device session owned by the current user.
   *
   * @param id - Better Auth session ID to revoke.
   */
  async function remove(id: string) {
    await $fetch(`/api/settings/devices/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { [headerName]: csrf }
    })
    await refresh()
  }

  /**
   * Revokes all other sessions, keeping the current device signed in.
   *
   * @returns Delete summary from the server.
   */
  async function removeOthers() {
    const result = await $fetch<DeleteDeviceSessionsResult>('/api/settings/devices', {
      method: 'DELETE',
      headers: { [headerName]: csrf }
    })
    await refresh()
    return result
  }

  return {
    devices,
    refresh,
    status,
    error,
    remove,
    removeOthers
  }
}
