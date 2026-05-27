// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

const reorderCvSection = vi.fn();

vi.mock('@/lib/cv-item-api', () => ({
  reorderCvSection: (...args: unknown[]) => reorderCvSection(...args),
  CvItemApiError: class CvItemApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { SortableManagedArraySection } from './sortable-managed-array-section';

type SkillItem = { id: string; name?: string };

describe('SortableManagedArraySection', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows move controls when two or more items and calls reorder on move up', async () => {
    const user = userEvent.setup();
    const onItemsChange = vi.fn();
    const items: SkillItem[] = [
      { id: 'id-a', name: 'Alpha' },
      { id: 'id-b', name: 'Beta' },
    ];

    reorderCvSection.mockResolvedValue({
      items: [
        { id: 'id-b', name: 'Beta' },
        { id: 'id-a', name: 'Alpha' },
      ],
    });

    render(
      <SortableManagedArraySection<SkillItem>
        cvId="cv-1"
        items={items}
        onItemsChange={onItemsChange}
        refetchItems={async () => items}
        entityLabel="Skill"
        addLabel="Add skill"
        reorderSection="skills"
        reorderSectionLabel="skill"
        createEmpty={() => ({ id: 'new', name: '' })}
        toPayload={(item) => item}
        api={{
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        }}
        renderView={(item) => ({ title: item.name ?? 'Skill' })}
        renderForm={() => null}
      />,
    );

    const moveUpButtons = screen.getAllByRole('button', { name: 'Move skill up' });
    expect(moveUpButtons[0]).toBeDisabled();
    const moveDownButtons = screen.getAllByRole('button', { name: 'Move skill down' });
    expect(moveDownButtons[0]).toBeEnabled();

    await user.click(moveUpButtons[1]!);

    expect(onItemsChange).toHaveBeenCalledWith([
      { id: 'id-b', name: 'Beta' },
      { id: 'id-a', name: 'Alpha' },
    ]);

    await waitFor(() => {
      expect(reorderCvSection).toHaveBeenCalledWith('cv-1', 'skills', ['id-b', 'id-a'], undefined);
    });

    await waitFor(() => expect(onItemsChange).toHaveBeenCalledTimes(1));
  });

  it('reverts optimistic order when reorder API fails', async () => {
    const user = userEvent.setup();
    const onItemsChange = vi.fn();
    const items: SkillItem[] = [
      { id: 'id-a', name: 'Alpha' },
      { id: 'id-b', name: 'Beta' },
    ];

    reorderCvSection.mockRejectedValue(new Error('Network error'));

    render(
      <SortableManagedArraySection<SkillItem>
        cvId="cv-1"
        items={items}
        onItemsChange={onItemsChange}
        refetchItems={async () => items}
        entityLabel="Skill"
        addLabel="Add skill"
        reorderSection="skills"
        reorderSectionLabel="skill"
        createEmpty={() => ({ id: 'new', name: '' })}
        toPayload={(item) => item}
        api={{
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        }}
        renderView={(item) => ({ title: item.name ?? 'Skill' })}
        renderForm={() => null}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Move skill up' })[1]!);

    await waitFor(() => {
      expect(onItemsChange).toHaveBeenLastCalledWith(items);
    });
  });

  it('hides reorder controls while creating', async () => {
    const user = userEvent.setup();
    const items: SkillItem[] = [
      { id: 'id-a', name: 'Alpha' },
      { id: 'id-b', name: 'Beta' },
    ];

    render(
      <SortableManagedArraySection<SkillItem>
        cvId="cv-1"
        items={items}
        onItemsChange={vi.fn()}
        refetchItems={async () => items}
        entityLabel="Skill"
        addLabel="Add skill"
        reorderSection="skills"
        reorderSectionLabel="skill"
        createEmpty={() => ({ id: 'id-new', name: 'New' })}
        toPayload={(item) => item}
        api={{
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        }}
        renderView={(item) => ({ title: item.name ?? 'Skill' })}
        renderForm={() => <input aria-label="Name" />}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add skill' }));

    expect(screen.queryByRole('button', { name: 'Move skill up' })).toBeNull();
    expect(screen.queryByLabelText('Reorder skill')).toBeNull();
  });
});
