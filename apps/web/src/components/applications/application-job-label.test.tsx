// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApplicationJobLabel } from './application-job-label';

describe('ApplicationJobLabel', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders stacked title and company on small screens', () => {
    render(
      <ApplicationJobLabel
        jobTitle="Engineering Manager"
        jobCompany="Acme Corp"
        variant="heading"
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Engineering Manager' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders compact back link label with arrow on title line', () => {
    render(
      <ApplicationJobLabel
        jobTitle="Engineering Manager"
        jobCompany="Acme Corp"
        variant="compact"
        showBackArrow
      />,
    );

    expect(screen.getAllByText('← Engineering Manager').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
  });

  it('styles company name with responsive muted text on desktop heading', () => {
    const { container } = render(
      <ApplicationJobLabel
        jobTitle="Engineering Manager"
        jobCompany="Acme Corp"
        variant="heading"
      />,
    );

    const desktopCompany = container.querySelector('span.lg\\:text-lg');
    expect(desktopCompany).toHaveClass('text-muted-foreground');
    expect(desktopCompany).toHaveTextContent('Acme Corp');
  });
});
