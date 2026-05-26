// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MetadataTextField } from './metadata-field';

describe('MetadataTextField', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a labeled value row', () => {
    render(<MetadataTextField label="Entity" value="Personal" />);

    expect(screen.getByText('Entity')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.queryByText('Entity: Personal')).not.toBeInTheDocument();
  });

  it('returns null for empty values', () => {
    const { container } = render(<MetadataTextField label="Type" value="" />);
    expect(container.firstChild).toBeNull();
  });
});
