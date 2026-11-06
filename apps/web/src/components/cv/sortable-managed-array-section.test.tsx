// @vitest-environment jsdom
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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
const mockGetCvSkills = vi.fn();

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

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getCvSkills: (...args: unknown[]) => mockGetCvSkills(...args),
  };
});

import { cvKeys } from '@/lib/queries/keys';
import { renderWithQueryClient } from '@/lib/queries/test-utils';
import { SortableManagedArraySection } from './sortable-managed-array-section';

beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

type SkillItem = { id: string; name?: string };

const alpha: SkillItem = { id: 'id-a', name: 'Alpha' };
const beta: SkillItem = { id: 'id-b', name: 'Beta' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderSection() {
  return renderWithQueryClient(
    <SortableManagedArraySection<SkillItem>
      cvId="cv-1"
      sectionKey="skills"
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
}

function titles(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('article:not([aria-hidden="true"])')).map(
    (article) => article.querySelector('.font-semibold')?.textContent ?? '',
  );
}

function listIds(queryClient: ReturnType<typeof renderSection>['queryClient']) {
  return (queryClient.getQueryData(cvKeys.sectionList('cv-1', 'skills')) as SkillItem[]).map(
    (item) => item.id,
  );
}

describe('SortableManagedArraySection', () => {
  beforeEach(() => {
    reorderCvSection.mockReset();
    mockGetCvSkills.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows move controls with disabled ends when there are two or more items', async () => {
    mockGetCvSkills.mockResolvedValue([alpha, beta]);

    renderSection();
    await screen.findByText('Beta');

    const moveUpButtons = screen.getAllByRole('button', { name: 'Move skill up' });
    const moveDownButtons = screen.getAllByRole('button', { name: 'Move skill down' });
    expect(moveUpButtons).toHaveLength(2);
    expect(moveUpButtons[0]).toBeDisabled();
    expect(moveUpButtons[1]).toBeEnabled();
    expect(moveDownButtons[0]).toBeEnabled();
    expect(moveDownButtons[1]).toBeDisabled();
  });

  it('shows no move controls with a single item', async () => {
    mockGetCvSkills.mockResolvedValue([alpha]);

    renderSection();
    await screen.findByText('Alpha');

    expect(screen.queryByRole('button', { name: 'Move skill up' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move skill down' })).toBeNull();
    expect(screen.queryByLabelText('Reorder skill')).toBeNull();
  });

  it('shows no move controls while the list is loading', () => {
    mockGetCvSkills.mockReturnValue(new Promise(() => undefined));

    renderSection();

    expect(screen.getByRole('status', { name: 'Loading skill entries' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move skill up' })).toBeNull();
  });

  it('applies the new order at once and saves it with reorderCvSection', async () => {
    const user = userEvent.setup();
    // The server returns the new order on any later reload.
    mockGetCvSkills.mockResolvedValueOnce([alpha, beta]).mockResolvedValue([beta, alpha]);
    const pending = deferred<{ items: SkillItem[] }>();
    reorderCvSection.mockReturnValue(pending.promise);

    const { container, queryClient } = renderSection();
    await screen.findByText('Beta');

    await user.click(screen.getAllByRole('button', { name: 'Move skill up' })[1]!);

    // Optimistic: the new order shows while the reorder request is still pending.
    await waitFor(() => expect(titles(container)).toEqual(['Beta', 'Alpha']));
    expect(reorderCvSection).toHaveBeenCalledTimes(1);
    expect(reorderCvSection).toHaveBeenCalledWith('cv-1', 'skills', ['id-b', 'id-a']);

    await act(async () => {
      pending.resolve({ items: [beta, alpha] });
      await pending.promise;
    });

    await waitFor(() => expect(titles(container)).toEqual(['Beta', 'Alpha']));
    expect(listIds(queryClient)).toEqual(['id-b', 'id-a']);
  });

  it('moves an item down', async () => {
    const user = userEvent.setup();
    mockGetCvSkills.mockResolvedValueOnce([alpha, beta]).mockResolvedValue([beta, alpha]);
    reorderCvSection.mockResolvedValue({ items: [beta, alpha] });

    const { container } = renderSection();
    await screen.findByText('Beta');

    await user.click(screen.getAllByRole('button', { name: 'Move skill down' })[0]!);

    expect(reorderCvSection).toHaveBeenCalledWith('cv-1', 'skills', ['id-b', 'id-a']);
    await waitFor(() => expect(titles(container)).toEqual(['Beta', 'Alpha']));
  });

  it('restores the previous order and shows the error when the reorder fails', async () => {
    const user = userEvent.setup();
    mockGetCvSkills.mockResolvedValue([alpha, beta]);
    reorderCvSection.mockRejectedValue(new Error('Network error'));

    const { container, queryClient } = renderSection();
    await screen.findByText('Beta');

    await user.click(screen.getAllByRole('button', { name: 'Move skill up' })[1]!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
    expect(titles(container)).toEqual(['Alpha', 'Beta']);
    expect(listIds(queryClient)).toEqual(['id-a', 'id-b']);
  });

  it('hides reorder controls while creating', async () => {
    const user = userEvent.setup();
    mockGetCvSkills.mockResolvedValue([alpha, beta]);

    renderSection();
    await screen.findByText('Beta');
    expect(screen.getAllByRole('button', { name: 'Move skill up' })).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Add skill' }));

    const nameInput = await screen.findByRole('textbox', { name: 'Name' });
    expect(nameInput).not.toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Move skill up' })).toBeNull();
    expect(screen.queryByLabelText('Reorder skill')).toBeNull();
  });

  it('hides reorder controls while an entry is being edited', async () => {
    const user = userEvent.setup();
    mockGetCvSkills.mockResolvedValue([alpha, beta]);

    const { container } = renderSection();
    await screen.findByText('Beta');

    const alphaRow = Array.from(container.querySelectorAll('article')).find((article) =>
      article.textContent?.includes('Alpha'),
    ) as HTMLElement;
    await user.click(within(alphaRow).getByRole('button', { name: 'Edit' }));

    expect(await screen.findByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move skill up' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move skill down' })).toBeNull();
  });
});
