// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfilePhotoCropDialog } from './profile-photo-crop-dialog';

describe('ProfilePhotoCropDialog', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render an img with empty src when closed and imageUrl is empty', () => {
    const { container } = render(
      <ProfilePhotoCropDialog open={false} imageUrl="" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBe(0);
  });

  it('renders an img with the preview URL when open and imageUrl is set', () => {
    const imageUrl = 'blob:http://localhost/test-image';

    const { container } = render(
      <ProfilePhotoCropDialog
        open={true}
        imageUrl={imageUrl}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(imageUrl);
  });
});
