// @vitest-environment jsdom
import type { Resume } from '@resumind/types';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ManagedBasicsSection } from './managed-basics-section';

vi.mock('@/components/cv/use-cv-item-mutation', () => ({
  useCvItemMutation: () => ({
    saving: false,
    error: null,
    setError: vi.fn(),
    run: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  deleteMedia: vi.fn(),
  getMediaMeta: vi.fn(),
  originalUrlForMediaId: vi.fn(),
  parseMediaIdFromImageUrl: vi.fn(() => null),
  patchMediaCrop: vi.fn(),
  profilePhotoPreviewUrl: (url?: string) => url ?? '',
  uploadResumeMedia: vi.fn(),
}));

vi.mock('@/lib/cv-item-api', () => ({
  patchCvBasics: vi.fn(),
}));

const basics: NonNullable<Resume['basics']> = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-0100',
  url: 'https://example.com',
  location: { city: 'Boston', region: 'MA', countryCode: 'US' },
};

describe('ManagedBasicsSection contact line', () => {
  afterEach(() => cleanup());

  it('renders contact fields with icons in view mode', () => {
    render(<ManagedBasicsSection cvId="cv-1" basics={basics} onBasicsChange={vi.fn()} />);

    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('555-0100')).toBeInTheDocument();
    expect(screen.getByText('Boston, MA, US')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /example\.com/i })).toBeInTheDocument();
  });
});
