export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');

/** Stored public files belong to Laravel, which may use a separate origin. */
export function resolveMaterialUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  // Frontend-owned assets such as `/images/news/...` must stay on the Vite
  // origin; only Laravel's public storage paths need the API origin.
  if (value.startsWith('/') && !value.startsWith('/storage/')) return value;
  try {
    const apiUrl = new URL(API_BASE_URL, window.location.origin);
    const url = new URL(value, apiUrl.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
