// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CvEditorSkeleton } from './cv-editor-skeleton';

describe('CvEditorSkeleton', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a main content placeholder without a section rail', () => {
    render(<CvEditorSkeleton />);

    expect(screen.getByRole('status', { name: 'Loading CV' })).toBeInTheDocument();

    const aside = document.querySelector('aside');
    expect(aside).toBeNull();
    expect(document.querySelector('nav')).toBeNull();
  });

  it('renders a generic section card for non-basics routes', () => {
    const { container } = render(<CvEditorSkeleton section="projects" />);

    expect(container.querySelector('.surface-soft')).toBeInTheDocument();
  });
});
