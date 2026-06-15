// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import FeaturesPage from './page';

describe('FeaturesPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the shared marketing header and feature cards with illustrations', () => {
    render(<FeaturesPage />);

    expect(screen.getByRole('link', { name: /Resubuild/i })).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('heading', { level: 2, name: /Every tool for a Polished CV/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Import a PDF CV/i })).toBeInTheDocument();
    expect(screen.queryByRole('video')).not.toBeInTheDocument();
  });

  it('links demo CTAs to /login', () => {
    render(<FeaturesPage />);

    const demoCta = screen.getByRole('link', { name: /Try the live demo/i });
    expect(demoCta).toHaveAttribute('href', '/login');
  });
});
