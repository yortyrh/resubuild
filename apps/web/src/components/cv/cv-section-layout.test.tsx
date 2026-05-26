// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/cv/cv-1/projects',
}));

import { CvSectionLayout } from './cv-section-layout';

function mockViewport(isDesktop: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 768px)' ? isDesktop : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('CvSectionLayout', () => {
  beforeEach(() => {
    mockViewport(true);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders section labels when expanded on desktop', () => {
    render(
      <CvSectionLayout cvId="cv-1">
        <div>Editor content</div>
      </CvSectionLayout>,
    );

    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByText('Editor content')).toBeInTheDocument();
  });

  it('collapses to icons only and restores labels on expand', () => {
    render(
      <CvSectionLayout cvId="cv-1">
        <div>Editor content</div>
      </CvSectionLayout>,
    );

    const nav = screen.getByRole('navigation', { name: 'CV sections' });

    fireEvent.click(screen.getByRole('button', { name: 'Toggle section navigation' }));

    expect(within(nav).getByText('Projects')).toHaveClass('hidden');
    expect(within(nav).getByRole('link', { name: 'Projects' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand section navigation' }));

    expect(within(nav).getByText('Projects')).toHaveClass('inline');
  });

  it('defaults to icons only on mobile viewports', () => {
    mockViewport(false);

    render(
      <CvSectionLayout cvId="cv-1">
        <div>Editor content</div>
      </CvSectionLayout>,
    );

    const nav = screen.getByRole('navigation', { name: 'CV sections' });

    expect(within(nav).getByRole('link', { name: 'Basics' })).toBeInTheDocument();
    expect(within(nav).getByText('Basics')).toHaveClass('hidden');
    expect(screen.getByRole('button', { name: 'Toggle section navigation' })).toBeInTheDocument();
  });
});
