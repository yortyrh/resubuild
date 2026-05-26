/**
 * Removes empty string fields from a resume section item before persistence.
 * Optional URI and date fields must be omitted — not sent as "" — to pass schema validation.
 */
export function sanitizeResumeItemPayload(item: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(item)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        result[key] = trimmed;
      }
      continue;
    }

    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }

  return result;
}
