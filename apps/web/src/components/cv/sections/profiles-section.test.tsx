// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfilesSection } from './profiles-section';

vi.mock('@/components/cv/cv-editor-provider', () => ({
  useCvEditor: () => ({
    cvId: 'cv-1',
    mountedSection: null,
    setMountedSection: vi.fn(),
  }),
}));

const sectionProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));

vi.mock('@/components/cv/use-section-mount', () => ({
  useSectionMount: vi.fn(),
}));

vi.mock('@/components/cv/sortable-managed-array-section', () => ({
  SortableManagedArraySection: (props: {
    renderView: (item: { network?: string; username?: string; url?: string }) => {
      title: ReactNode;
      body: ReactNode | null;
    };
  }) => {
    sectionProps.current = props as unknown as Record<string, unknown>;
    const { renderView } = props;
    const item = {
      network: 'GitHub',
      username: 'janedoe',
      url: 'https://github.com/janedoe',
    };
    const { title, body } = renderView(item);
    return (
      <div>
        <div data-testid="title">{title}</div>
        {body}
      </div>
    );
  },
}));

describe('ProfilesSection view', () => {
  afterEach(() => cleanup());

  it('shows network title with icon for GitHub profile', () => {
    render(<ProfilesSection />);
    const title = screen.getByTestId('title');
    expect(title).toHaveTextContent('GitHub');
    expect(title).toHaveTextContent('janedoe');
    expect(title.querySelector('svg')).toBeTruthy();
  });

  it('lets the section load its own entries instead of passing items', () => {
    render(<ProfilesSection />);

    expect(sectionProps.current).toEqual(
      expect.objectContaining({
        cvId: 'cv-1',
        sectionKey: 'profiles',
        reorderSection: 'profiles',
      }),
    );
    expect(sectionProps.current).not.toHaveProperty('items');
    expect(sectionProps.current).not.toHaveProperty('onItemsChange');
  });
});
