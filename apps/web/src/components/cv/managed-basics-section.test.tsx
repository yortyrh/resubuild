// @vitest-environment jsdom
import type { Resume } from '@resumind/types';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  deleteMedia: vi.fn(),
  getMediaMeta: vi.fn(),
  parseMediaIdFromImageUrl: vi.fn(() => null),
  patchMediaCrop: vi.fn(),
  uploadResumeMedia: vi.fn(),
}));

vi.mock('@/lib/cv-item-api', () => ({
  patchCvBasics: vi.fn(),
}));

vi.mock('@/components/cv/markdown-view', () => ({
  MarkdownView: ({ value }: { value?: string }) => <div data-testid="basics-summary">{value}</div>,
}));

vi.mock('@/components/cv/profile-photo-thumbnail', () => ({
  ProfilePhotoThumbnail: () => <div data-testid="profile-photo" />,
}));

vi.mock('@/components/cv/profile-photo-crop-dialog', () => ({
  ProfilePhotoCropDialog: () => null,
}));

import { ManagedBasicsSection } from './managed-basics-section';

const basics: NonNullable<Resume['basics']> = {
  name: 'Jane Doe',
  label: 'Engineer',
  email: 'jane@example.com',
  summary: 'A versatile engineer.',
};

describe('ManagedBasicsSection', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders Edit in the bottom action bar below the summary', () => {
    const { container } = render(
      <ManagedBasicsSection
        cvId="cv-1"
        version="v1"
        onVersionChange={vi.fn()}
        basics={basics}
        onBasicsChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByTestId('basics-summary')).toHaveTextContent('A versatile engineer.');

    const editButton = screen.getByRole('button', { name: 'Edit' });
    const summary = screen.getByTestId('basics-summary');
    const headerRow = container.querySelector('.flex.items-start.justify-between');

    expect(headerRow).not.toBeNull();
    expect(headerRow?.contains(editButton)).toBe(false);
    expect(
      summary.compareDocumentPosition(editButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(editButton.closest('.mt-3.flex.gap-2')).not.toBeNull();
  });
});
