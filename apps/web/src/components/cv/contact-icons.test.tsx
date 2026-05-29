// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ContactIcon, ContactLineSegment, SocialNetworkIcon } from './contact-icons';

describe('ContactIcon', () => {
  afterEach(() => cleanup());

  it('renders map pin for location type', () => {
    const { container } = render(<ContactIcon type="location" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

describe('SocialNetworkIcon', () => {
  afterEach(() => cleanup());

  it('renders GitHub brand icon for GitHub network', () => {
    const { container } = render(<SocialNetworkIcon network="GitHub" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders X brand icon for Twitter alias', () => {
    const { container } = render(<SocialNetworkIcon network="Twitter" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders fallback for unknown network', () => {
    const { container } = render(<SocialNetworkIcon network="My Blog" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

describe('ContactLineSegment', () => {
  afterEach(() => cleanup());

  it('shows email icon with child text', () => {
    render(
      <ContactLineSegment type="email">
        <span>jane@example.com</span>
      </ContactLineSegment>,
    );
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });
});
