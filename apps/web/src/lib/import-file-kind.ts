export type ImportFileKind = 'json' | 'pdf' | 'markdown';

export const IMPORT_FILE_ACCEPT = {
  'application/json': ['.json'],
  'application/pdf': ['.pdf'],
  'text/markdown': ['.md', '.markdown'],
  'text/plain': ['.txt', '.md', '.markdown'],
} as const;

export const IMPORT_FILE_MAX_BYTES = 5 * 1024 * 1024;

const MAX_BYTES_BY_KIND: Record<ImportFileKind, number> = {
  json: 1024 * 1024,
  pdf: 5 * 1024 * 1024,
  markdown: 512 * 1024,
};

export function detectImportFileKind(file: File): ImportFileKind | null {
  const name = file.name.toLowerCase();

  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    return 'pdf';
  }

  if (file.type === 'application/json' || name.endsWith('.json')) {
    return 'json';
  }

  if (
    file.type === 'text/markdown' ||
    file.type === 'text/x-markdown' ||
    name.endsWith('.md') ||
    name.endsWith('.markdown') ||
    (file.type === 'text/plain' &&
      (name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.txt')))
  ) {
    return 'markdown';
  }

  return null;
}

export function getImportFileMaxBytes(kind: ImportFileKind): number {
  return MAX_BYTES_BY_KIND[kind];
}

export function importFileKindLabel(kind: ImportFileKind): string {
  switch (kind) {
    case 'json':
      return 'JSON Resume';
    case 'pdf':
      return 'PDF résumé';
    case 'markdown':
      return 'Markdown résumé';
  }
}

export function importFileKindRequiresAgent(kind: ImportFileKind): boolean {
  return kind === 'pdf' || kind === 'markdown';
}
