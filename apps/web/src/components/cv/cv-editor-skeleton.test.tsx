// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CvEditorSkeleton } from './cv-editor-skeleton';

describe('CvEditorSkeleton', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a responsive sidebar and basics card placeholders', () => {
    render(<CvEditorSkeleton />);

    expect(screen.getByRole('status', { name: 'Loading CV' })).toBeInTheDocument();

    const aside = screen.getByRole('status').querySelector('aside');
    expect(aside).toHaveClass('w-12');
    expect(aside).toHaveClass('md:w-48');

    const navItems = aside?.querySelectorAll('nav > div');
    expect(navItems).toHaveLength(13);
  });

  it('renders a generic section card for non-basics routes', () => {
    const { container } = render(<CvEditorSkeleton section="projects" />);

    expect(container.querySelectorAll('.mt-2 > *')).toHaveLength(5);
    expect(container.querySelector('.surface-soft')).toBeInTheDocument();
  });
});
