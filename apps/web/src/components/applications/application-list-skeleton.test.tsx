// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApplicationListSkeleton } from './application-list-skeleton';

describe('ApplicationListSkeleton', () => {
  it('renders a busy region announcing "Loading applications" for assistive tech', () => {
    const { container } = render(<ApplicationListSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.getByText('Loading applications')).toBeInTheDocument();
  });

  it('renders three placeholder rows inside the surface-soft data table', () => {
    const { container } = render(<ApplicationListSkeleton />);
    const surface = container.querySelector('.surface-soft');
    expect(surface).toBeTruthy();
    const table = surface?.querySelector('table');
    expect(table).toBeTruthy();
    const rows = table?.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
  });

  it('renders three mobile card placeholders so the loading state is consistent below md', () => {
    const { container } = render(<ApplicationListSkeleton />);
    const cardSurfaces = container.querySelectorAll('.md\\:hidden .surface-soft');
    expect(cardSurfaces).toHaveLength(3);
    for (const card of cardSurfaces) {
      expect(card.className).toContain('text-card-foreground');
    }
  });
});
