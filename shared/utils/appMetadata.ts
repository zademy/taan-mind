/**
 * Shared application metadata used by the UI and server-rendered responses.
 *
 * Keep this centralized so visible version labels and session device metadata
 * do not drift across the app.
 */
/**
 * Application name and version constants.
 *
 * Centralized here so version labels, device metadata, and any other
 * visible version strings stay in sync across the entire app.
 */

export const APP_NAME = 'Taan Mind'
/** Human-readable client identifier shown in device sessions, e.g. "Taan Mind Web v1.0.13" */
export const APP_CLIENT_NAME = 'Taan Mind Web'
export const APP_VERSION = 'v1.0.13'
/** Full display name built from client name and version. */
export const APP_DISPLAY_NAME = `${APP_CLIENT_NAME} ${APP_VERSION}`
