/// <reference types="vite/client" />
/**
 * Shared API base URL — extracted to its own module so importing it from
 * lazy-loaded routes doesn't drag the entire AuditFlow chunk into the
 * main entry bundle. (Vite's tree-shaker treats any static import of a
 * lazy-loaded module as a signal to fold it back into the parent chunk.)
 */

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://127.0.0.1:8000';
