/**
 * Safe fetch helper that guards against HTML responses (e.g. Vercel 500 error pages,
 * Vercel Deployment Protection auth gates, or missing routes) and provides clean error messages.
 * Automatically forwards Authorization token from localStorage if present.
 */
export async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers || {});
  if (!headers.has('Content-Type') && !(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach token from localStorage if available and not already provided
  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    try {
      const token = localStorage.getItem('portal_token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch {
      // ignore
    }
  }

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();

  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<body')) {
      throw new Error(
        `Server returned an HTML response instead of JSON (HTTP ${res.status}). ` +
        `If deployed on Vercel, check that your Supabase environment variables are configured and Vercel Deployment Protection is turned off.`
      );
    }
    throw new Error(text.slice(0, 200) || `Request failed with status ${res.status}`);
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }

  return data;
}

