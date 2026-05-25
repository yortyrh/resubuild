// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { tagPillClassName } from './tags-input';
import { TagsList } from './tags-list';

describe('TagsList', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders each value as a pill span', () => {
    const { container } = render(<TagsList values={['React', 'TypeScript']} />);

    const pills = container.querySelectorAll('span');
    expect(pills).toHaveLength(2);
    expect(pills[0]).toHaveTextContent('React');
    expect(pills[1]).toHaveTextContent('TypeScript');
    expect(pills[0]).toHaveClass(...tagPillClassName.split(' '));
    expect(pills[1]).toHaveClass(...tagPillClassName.split(' '));
  });

  it('does not render comma-joined keyword text', () => {
    render(<TagsList values={['React', 'TypeScript']} />);

    expect(screen.queryByText('React, TypeScript')).not.toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('returns null for empty values', () => {
    const { container } = render(<TagsList values={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
