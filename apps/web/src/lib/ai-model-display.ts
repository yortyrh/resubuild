import type { AiModelOptionField, AiModelOptions } from '@/lib/api';

/** Provider name without the catalog's "(BYOK — …)" hint, e.g. "OpenAI". */
export function shortProviderName(displayName: string): string {
  return displayName.replace(/\s*\(BYOK[^)]*\)\s*$/, '').trim() || displayName;
}

/** Name an account gets when it has no label, e.g. "Anthropic · Claude Opus 4.5". */
export function defaultAccountName(providerName: string, modelName: string): string {
  return `${shortProviderName(providerName)} · ${modelName}`;
}

/** Option fields that apply to the model and whose `dependsOn` condition holds. */
export function visibleOptionFields(
  fields: AiModelOptionField[],
  reasoning: boolean,
  options: AiModelOptions,
): AiModelOptionField[] {
  return fields.filter((field) => {
    if (field.reasoningOnly && !reasoning) return false;
    if (!field.dependsOn) return true;
    const value = options[field.dependsOn.key];
    return typeof value === 'string' && field.dependsOn.values.includes(value);
  });
}

/** Keep only options that are still visible (e.g. after a model or provider change). */
export function pruneModelOptions(
  fields: AiModelOptionField[],
  reasoning: boolean,
  options: AiModelOptions,
): AiModelOptions {
  // Apply twice so a field whose parent was dropped is dropped too.
  let current = options;
  for (let pass = 0; pass < 2; pass += 1) {
    const keys = new Set(visibleOptionFields(fields, reasoning, current).map((field) => field.key));
    current = Object.fromEntries(Object.entries(current).filter(([key]) => keys.has(key)));
  }
  return current;
}

/** Short labels for the options set on an account, e.g. ["Reasoning effort: high"]. */
export function describeModelOptions(
  fields: AiModelOptionField[],
  options: AiModelOptions | undefined,
): string[] {
  if (!options) return [];
  return fields
    .filter((field) => options[field.key] !== undefined && options[field.key] !== '')
    .map((field) => `${field.label}: ${options[field.key]}`);
}

/** Compact token count, e.g. 950 → "950", 12_300 → "12.3k", 2_000_000 → "2M". */
export function formatTokens(count: number): string {
  const format = (value: number, unit: string) =>
    `${Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, '')}${unit}`;
  if (count >= 1_000_000) return format(count / 1_000_000, 'M');
  if (count >= 1_000) return format(count / 1_000, 'k');
  return String(Math.max(0, Math.round(count)));
}
