// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/cv/cv-1/projects',
}));

import { CvSectionLayout } from './cv-section-layout';

describe('CvSectionLayout', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders children and does not render the section nav chrome', () => {
    render(
      <CvSectionLayout cvId="cv-1">
        <div>Editor content</div>
      </CvSectionLayout>,
    );

    expect(screen.getByText('Editor content')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'CV sections' })).not.toBeInTheDocument();
    expect(document.querySelector('aside')).toBeNull();
  });
});
