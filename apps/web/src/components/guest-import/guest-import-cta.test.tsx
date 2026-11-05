// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getGuestImportStatus = vi.hoisted(() => vi.fn());
vi.mock('@/lib/guest-import-api', () => ({ getGuestImportStatus }));

import { GuestImportCta } from './guest-import-cta';

describe('GuestImportCta', () => {
  afterEach(() => cleanup());

  it('links to the wizard while it is open', async () => {
    getGuestImportStatus.mockResolvedValue({ enabled: true });
    render(<GuestImportCta />);
    expect(await screen.findByRole('link', { name: 'Import your CV free' })).toHaveAttribute(
      'href',
      '/import',
    );
  });

  it('renders nothing while it is closed', async () => {
    getGuestImportStatus.mockResolvedValue({ enabled: false });
    const { container } = render(<GuestImportCta />);
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
  });
});
