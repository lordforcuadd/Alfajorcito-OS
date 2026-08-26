import { type ComponentType, lazy, type LazyExoticComponent } from 'react';

/**
 * Production-grade lazy loading wrapper with automatic retry and auto-reload on version updates.
 * Prevents "TypeError: Failed to fetch dynamically imported module" when a new deployment
 * has replaced chunk hashes on the server while a user still has an older version open.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  componentName: string
): LazyExoticComponent<T> {
  return lazy(async () => {
    const key = `lazy_retry_${componentName}`;
    const alreadyRetried = typeof window !== 'undefined' && window.sessionStorage.getItem(key) === 'true';

    try {
      const component = await componentImport();
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
      }
      return component;
    } catch (error: any) {
      console.warn(`[LazyRetry] Dynamic chunk import failed for ${componentName}:`, error);

      // Check if it is a dynamic import / network chunk load failure
      const isChunkError =
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('error loading dynamically imported module');

      if (isChunkError && !alreadyRetried && typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, 'true');
        // Force reload from server to fetch latest index.html and fresh chunk URLs
        window.location.reload();
        // Return unresolved promise while browser navigates/reloads
        return new Promise<{ default: T }>(() => {});
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
      }
      throw error;
    }
  });
}
