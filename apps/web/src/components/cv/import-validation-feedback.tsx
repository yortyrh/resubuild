'use client';

import { useId } from 'react';
import type { ImportSourcePreview } from '@/lib/import-cv-preview';
import {
  type ImportValidationSource,
  shouldShowJsonValidation,
} from '@/lib/import-validation-source';

export interface ImportValidationFeedbackProps {
  validationSource: ImportValidationSource;
  preview: ImportSourcePreview | null;
  fileError?: string | null;
}

export function ImportValidationFeedback({
  validationSource,
  preview,
  fileError,
}: ImportValidationFeedbackProps) {
  const schemaAlertId = useId();
  const showValidation = shouldShowJsonValidation(validationSource);

  const jsonError = showValidation && preview && !preview.valid ? preview.message : null;
  const schemaErrors =
    showValidation && preview && !preview.valid ? preview.schemaErrors : undefined;

  return (
    <>
      {fileError ? <p className="text-destructive text-sm">{fileError}</p> : null}
      {jsonError ? <p className="text-destructive text-sm">{jsonError}</p> : null}
      {schemaErrors && schemaErrors.length > 0 ? (
        <div
          className="border-destructive/30 bg-destructive/5 rounded-md border p-3"
          role="alert"
          aria-labelledby={schemaAlertId}
        >
          <p id={schemaAlertId} className="text-destructive mb-2 text-sm font-medium">
            Fix these schema issues before importing:
          </p>
          <ul className="text-destructive list-inside list-disc space-y-1 text-sm">
            {schemaErrors.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
