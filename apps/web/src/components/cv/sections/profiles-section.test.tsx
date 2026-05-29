// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfilesSection } from './profiles-section';

vi.mock('@/components/cv/cv-editor-provider', () => ({
  useCvEditor: () => ({
    cvId: 'cv-1',
    resume: {
      basics: {
        profiles: [
          {
            id: 'p1',
            network: 'GitHub',
            username: 'janedoe',
            url: 'https://github.com/janedoe',
          },
        ],
      },
    },
    setResume: vi.fn(),
  }),
}));

vi.mock('@/components/cv/use-section-mount', () => ({
  useSectionMount: vi.fn(),
}));

vi.mock('@/components/cv/sortable-managed-array-section', () => ({
  SortableManagedArraySection: ({
    renderView,
  }: {
    renderView: (item: { network?: string; username?: string; url?: string }) => {
      title: ReactNode;
      body: ReactNode | null;
    };
  }) => {
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
});
