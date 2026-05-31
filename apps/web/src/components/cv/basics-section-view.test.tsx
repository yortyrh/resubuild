// @vitest-environment jsdom
import type { Resume, ResumeProfile } from '@resumind/types';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BasicsSectionView } from './basics-section-view';

vi.mock('@/lib/api', () => ({
  profilePhotoPreviewUrl: (url?: string) => (url ? `${url}/thumbnail` : undefined),
  parseMediaIdFromImageUrl: (url?: string) => {
    if (!url) return null;
    const match = url.match(
      /\/media\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i,
    );
    return match ? match[1] : null;
  },
}));

const basics: NonNullable<Resume['basics']> = {
  name: 'Thomas Davis',
  label: 'Engineering Manager',
  image: 'http://localhost:3001/media/64a52e60-67c7-4a32-94d6-075ac06ea1ca',
  email: 'thomas@example.com',
};

const profiles: ResumeProfile[] = [
  {
    network: 'GitHub',
    username: 'janedoe',
    url: 'https://github.com/janedoe',
  },
];

describe('BasicsSectionView', () => {
  afterEach(() => cleanup());

  it('renders profile photo when showImage is true', () => {
    render(<BasicsSectionView basics={basics} />);

    expect(screen.getByRole('img', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByText('Thomas Davis')).toBeInTheDocument();
  });

  it('hides profile photo and shows social profiles in application mode', () => {
    render(<BasicsSectionView basics={basics} profiles={profiles} showImage={false} />);

    expect(screen.queryByRole('img', { name: 'Profile' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'janedoe' })).toHaveAttribute(
      'href',
      'https://github.com/janedoe',
    );
  });
});
