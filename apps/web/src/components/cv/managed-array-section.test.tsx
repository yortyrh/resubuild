// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ManagedArraySection } from './managed-array-section';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/queries/cv-queries', () => ({
  useCvSection: () => ({ data: undefined, isLoading: false, error: null }),
}));

vi.mock('@/lib/queries/cv-mutations', () => ({
  useSectionItemMutations: () => ({
    saving: false,
    error: null,
    setError: vi.fn(),
    run: vi.fn(),
    refetchSectionItems: vi.fn(),
  }),
}));

type TestItem = {
  id?: string;
  name?: string;
  startDate?: string;
};

describe('ManagedArraySection cross-section move', () => {
  afterEach(() => cleanup());

  it('shows move button on saved rows and opens confirmation dialog', async () => {
    const onMove = vi.fn().mockResolvedValue(undefined);

    render(
      <ManagedArraySection<TestItem>
        cvId="cv-1"
        sectionKey="work"
        items={[{ id: 'w1', name: 'Acme', startDate: '2020-01' }]}
        onItemsChange={vi.fn()}
        entityLabel="Work entry"
        addLabel="Add work"
        createEmpty={() => ({})}
        toPayload={(item) => item}
        api={{
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        }}
        renderView={(item) => ({ title: item.name ?? 'Entry' })}
        renderForm={() => null}
        crossSectionMove={{
          buttonLabel: 'Move to Volunteer',
          dialogTitle: 'Move to Volunteer?',
          dialogDescription: 'This entry will move.',
          confirmLabel: 'Move to Volunteer',
          successMessage: 'Moved',
          onMove,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move to Volunteer' }));
    expect(screen.getByRole('heading', { name: 'Move to Volunteer?' })).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Move to Volunteer' })[1]!);

    await waitFor(() => {
      expect(onMove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'w1', name: 'Acme' }),
      );
    });
  });

  it('does not show move button on create draft', () => {
    render(
      <ManagedArraySection<TestItem>
        cvId="cv-1"
        sectionKey="work"
        items={[]}
        onItemsChange={vi.fn()}
        entityLabel="Work entry"
        addLabel="Add work"
        createEmpty={() => ({ startDate: '2024-01' })}
        toPayload={(item) => item}
        api={{
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        }}
        renderView={() => ({ title: 'Saved' })}
        renderForm={(_item, _onChange, context) => (
          <div>{context?.mode === 'create' ? 'Create draft' : 'Edit draft'}</div>
        )}
        crossSectionMove={{
          buttonLabel: 'Move to Volunteer',
          dialogTitle: 'Move to Volunteer?',
          dialogDescription: 'This entry will move.',
          confirmLabel: 'Move to Volunteer',
          successMessage: 'Moved',
          onMove: vi.fn(),
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add work' }));
    expect(screen.queryByRole('button', { name: 'Move to Volunteer' })).toBeNull();
  });
});
