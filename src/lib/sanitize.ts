/**
 * Input sanitization utilities to prevent XSS attacks.
 * Used for user-provided text that might be rendered in the UI.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escape HTML special characters to prevent XSS.
 */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Sanitize text input — removes script tags, event handlers, and dangerous patterns.
 * Preserves normal Arabic text, numbers, and safe punctuation.
 */
export function sanitizeText(input: string): string {
  if (!input) return '';

  let sanitized = input;

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript\s*:/gi, '');

  // Remove data: URIs that could execute code
  sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, '');

  // Remove any remaining HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Trim excessive whitespace
  sanitized = sanitized.replace(/\s{3,}/g, '  ').trim();

  return sanitized;
}

/**
 * Sanitize a phone number — only allow digits, +, and spaces.
 */
export function sanitizePhone(input: string): string {
  return input.replace(/[^\d+\s\-()]/g, '').trim();
}

/**
 * Sanitize search query — allow Arabic, Latin, digits, and basic punctuation.
 */
export function sanitizeSearchQuery(input: string): string {
  // Allow Arabic chars, Latin, digits, spaces, common punctuation
  return input.replace(/[^\u0600-\u06FF\u0750-\u077F\w\s.,!?@#%-]/g, '').trim();
}
