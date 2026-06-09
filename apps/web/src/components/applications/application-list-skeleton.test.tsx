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

  it('renders three placeholder list items matching the application list layout', () => {
    const { container } = render(<ApplicationListSkeleton />);
    const list = container.querySelector('ul.space-y-3');
    expect(list).toBeTruthy();
    expect(list?.querySelectorAll('li')).toHaveLength(3);
    // Each placeholder item uses the same surface-soft card as a real list row.
    expect(list?.querySelectorAll('li.surface-soft')).toHaveLength(3);
  });
});
