/** Whether JSON schema/parse validation messages should be shown to the user. */
export type ImportValidationSource = 'none' | 'direct' | 'agent' | 'edited';

export function shouldShowJsonValidation(source: ImportValidationSource): boolean {
  return source === 'direct' || source === 'edited';
}
