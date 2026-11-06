// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockGetCvSkills = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getCvSkills: (...args: unknown[]) => mockGetCvSkills(...args),
  };
});

import { renderWithQueryClient } from '@/lib/queries/test-utils';
import { ManagedArraySection } from './managed-array-section';

type Item = { id?: string; name?: string };

const items: Item[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
];

const update = vi.fn();

async function setup() {
  const view = renderWithQueryClient(
    <ManagedArraySection<Item>
      cvId="cv-1"
      sectionKey="skills"
      entityLabel="Skill"
      addLabel="Add skill"
      createEmpty={() => ({ name: '' })}
      toPayload={(item) => item}
      api={{
        create: vi.fn().mockResolvedValue({}),
        update,
        delete: vi.fn(),
      }}
      renderView={(item) => ({ title: item.name ?? '' })}
      renderForm={() => <input aria-label="Name" />}
    />,
  );
  await screen.findByText('Gamma');
  return view;
}

function highlightedTitles(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('article[data-highlighted]')).map(
    (a) => a.textContent ?? '',
  );
}

function rowFor(container: HTMLElement, name: string): HTMLElement {
  const row = Array.from(container.querySelectorAll('article')).find((a) =>
    a.textContent?.includes(name),
  );
  if (!row) {
    throw new Error(`row ${name} not found`);
  }
  return row as HTMLElement;
}

function editRow(container: HTMLElement, name: string) {
  const edit = Array.from(rowFor(container, name).querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === 'Edit',
  )!;
  fireEvent.click(edit);
}

describe('ManagedArraySection edited-row highlight', () => {
  beforeEach(() => {
    mockGetCvSkills.mockReset();
    mockGetCvSkills.mockResolvedValue(items);
    update.mockReset();
    update.mockResolvedValue({ item: { id: 'b', name: 'Beta' } });
  });
  afterEach(() => cleanup());

  it('marks no row initially', async () => {
    const { container } = await setup();
    expect(highlightedTitles(container)).toEqual([]);
  });

  it('does not mark a row while it is being edited', async () => {
    const { container } = await setup();
    editRow(container, 'Beta');
    expect(container.querySelectorAll('article[data-highlighted]')).toHaveLength(0);
  });

  it('marks only the edited row after Cancel', async () => {
    const { container } = await setup();
    editRow(container, 'Beta');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const marked = highlightedTitles(container);
    expect(marked).toHaveLength(1);
    expect(marked[0]).toContain('Beta');
    expect(rowFor(container, 'Beta').className).toContain('outline');
    expect(rowFor(container, 'Alpha').hasAttribute('data-highlighted')).toBe(false);
    expect(rowFor(container, 'Gamma').hasAttribute('data-highlighted')).toBe(false);
  });

  it('marks the edited row after Escape cancels', async () => {
    const { container } = await setup();
    editRow(container, 'Gamma');
    fireEvent.keyDown(document.body, { key: 'Escape' });
    const marked = highlightedTitles(container);
    expect(marked).toHaveLength(1);
    expect(marked[0]).toContain('Gamma');
  });

  it('marks the edited row after a successful save', async () => {
    const { container } = await setup();
    editRow(container, 'Beta');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const marked = highlightedTitles(container);
      expect(marked).toHaveLength(1);
      expect(marked[0]).toContain('Beta');
    });
  });

  it('clears the mark when another edit starts', async () => {
    const { container } = await setup();
    editRow(container, 'Beta');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    editRow(container, 'Alpha');
    expect(highlightedTitles(container)).toEqual([]);
  });

  it('moves the mark to the newly edited row after the second cancel', async () => {
    const { container } = await setup();
    editRow(container, 'Beta');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    editRow(container, 'Alpha');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const marked = highlightedTitles(container);
    expect(marked).toHaveLength(1);
    expect(marked[0]).toContain('Alpha');
  });

  it('clears the mark when the create form is started', async () => {
    const { container } = await setup();
    editRow(container, 'Beta');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(highlightedTitles(container)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
    expect(highlightedTitles(container)).toEqual([]);
  });

  it('does not mark any row after cancelling the create form', async () => {
    const { container } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(highlightedTitles(container)).toEqual([]);
  });

  it('removes the mark on a pointerdown outside the highlighted row', async () => {
    const { container } = await setup();
    editRow(container, 'Beta');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(highlightedTitles(container)).toHaveLength(1);
    fireEvent.pointerDown(rowFor(container, 'Alpha'));
    expect(highlightedTitles(container)).toEqual([]);
  });

  it('keeps the mark on a pointerdown inside the highlighted row', async () => {
    const { container } = await setup();
    editRow(container, 'Beta');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.pointerDown(rowFor(container, 'Beta'));
    expect(highlightedTitles(container)).toHaveLength(1);
  });
});
