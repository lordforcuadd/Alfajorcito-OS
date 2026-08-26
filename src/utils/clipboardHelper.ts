/**
 * Robust clipboard utility that gracefully falls back to document.execCommand('copy')
 * when running in insecure contexts (HTTP on LAN / local IP without HTTPS)
 * or when the async Clipboard API is blocked by browser policies.
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text || !text.trim()) return false;

  // 1. Try modern async Clipboard API if available
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue to fallback
    }
  }

  // 2. Legacy fallback via temporary off-screen textarea
  try {
    if (typeof document !== 'undefined' && document.body) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return Boolean(successful);
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Copies rich HTML text along with plain text fallback (e.g. for Google Docs, Word).
 * If rich ClipboardItem writing fails or is unavailable in HTTP/insecure contexts,
 * it seamlessly degrades to plain text via copyText().
 */
export async function copyRichReference(plainText: string, htmlText: string): Promise<boolean> {
  try {
    if (
      typeof ClipboardItem !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.write === 'function'
    ) {
      const blobHtml = new Blob([htmlText], { type: 'text/html' });
      const blobText = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })]);
      return true;
    }
  } catch {
    // Fallback to robust plain text copy via copyText
  }
  return await copyText(plainText);
}
