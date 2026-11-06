// @vitest-environment jsdom

import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetCv = vi.fn();
const mockGetCvWork = vi.fn();
const mockGetCvVolunteer = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getCv: (...args: unknown[]) => mockGetCv(...args),
    getCvWork: (...args: unknown[]) => mockGetCvWork(...args),
    getCvVolunteer: (...args: unknown[]) => mockGetCvVolunteer(...args),
  };
});

import type { CvItemMutationResponse } from '@/lib/cv-item-api';
import { cvKeys } from '@/lib/queries/keys';
import { createNoRetryTestQueryClient, renderWithQueryClient } from '@/lib/queries/test-utils';
import { ManagedArraySection, type ManagedArraySectionProps } from './managed-array-section';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

type TestItem = {
  id?: string;
  name?: string;
  startDate?: string;
};

const CV = 'cv-1';
const NO_ENTRIES = 'No entries yet';
const LOADING_LABEL = 'Loading work entry entries';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeApi() {
  return {
    create:
      vi.fn<(cvId: string, item: Record<string, unknown>) => Promise<CvItemMutationResponse>>(),
    update:
      vi.fn<
        (
          cvId: string,
          itemId: string,
          item: Record<string, unknown>,
        ) => Promise<CvItemMutationResponse>
      >(),
    delete: vi.fn<(cvId: string, itemId: string) => Promise<CvItemMutationResponse>>(),
  };
}

type SectionProps = ManagedArraySectionProps<TestItem>;

function renderSection(
  overrides: Partial<SectionProps> = {},
  queryClient = createNoRetryTestQueryClient(),
) {
  const api = (overrides.api as ReturnType<typeof makeApi> | undefined) ?? makeApi();
  const props: SectionProps = {
    cvId: CV,
    sectionKey: 'work',
    entityLabel: 'Work entry',
    addLabel: 'Add work',
    emptyText: 'Jobs you held, newest first.',
    createEmpty: () => ({ name: '' }),
    toPayload: (item) => item as Record<string, unknown>,
    api,
    renderView: (item) => ({ title: item.name ?? 'Entry' }),
    renderForm: (item, onChange) => (
      <input
        aria-label="Name"
        value={item.name ?? ''}
        onChange={(event) => onChange({ ...item, name: event.target.value })}
      />
    ),
    ...overrides,
  };
  const view = renderWithQueryClient(<ManagedArraySection<TestItem> {...props} />, {
    queryClient,
  });
  return { ...view, api };
}

function cardTitles(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('article:not([aria-hidden="true"])')).map(
    (article) => article.querySelector('.font-semibold')?.textContent ?? '',
  );
}

function rowFor(container: HTMLElement, name: string): HTMLElement {
  const row = Array.from(container.querySelectorAll('article')).find((article) =>
    article.textContent?.includes(name),
  );
  if (!row) {
    throw new Error(`row ${name} not found`);
  }
  return row as HTMLElement;
}

const threeItems: TestItem[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
];

const byNameAsc = (items: TestItem[]) =>
  [...items].sort((left, right) => (left.name ?? '').localeCompare(right.name ?? ''));

beforeEach(() => {
  mockGetCv.mockReset();
  mockGetCvWork.mockReset();
  mockGetCvVolunteer.mockReset();
});

afterEach(() => cleanup());

describe('ManagedArraySection loading states', () => {
  it('shows a skeleton, never the empty state, while the list is loading', () => {
    mockGetCvWork.mockReturnValue(new Promise(() => undefined));

    renderSection();

    const status = screen.getByRole('status', { name: LOADING_LABEL });
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText(NO_ENTRIES)).not.toBeInTheDocument();
  });

  it('loads the list of its own section for its cv', async () => {
    mockGetCvWork.mockResolvedValue([]);

    renderSection();

    await screen.findByText(NO_ENTRIES);
    expect(mockGetCvWork).toHaveBeenCalledWith(CV);
    expect(mockGetCvVolunteer).not.toHaveBeenCalled();
  });

  it('shows the empty state only when the server returned no entries', async () => {
    mockGetCvWork.mockResolvedValue([]);

    renderSection();

    expect(await screen.findByText(NO_ENTRIES)).toBeInTheDocument();
    expect(screen.getByText('Jobs you held, newest first.')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: LOADING_LABEL })).not.toBeInTheDocument();
  });

  it('shows an error with a retry action, never the empty state, when the load fails', async () => {
    mockGetCvWork.mockRejectedValue(new Error('Request failed (500)'));

    renderSection();

    const alert = await screen.findByRole('alert', {}, { timeout: 3000 });
    expect(alert).toHaveTextContent('Request failed (500)');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText(NO_ENTRIES)).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: LOADING_LABEL })).not.toBeInTheDocument();
  });

  it('retry refetches the list and shows the entries', async () => {
    mockGetCvWork
      .mockRejectedValueOnce(new Error('Request failed (500)'))
      .mockResolvedValue([{ id: 'a', name: 'Alpha' }]);

    renderSection();

    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }, { timeout: 3000 }));

    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(mockGetCvWork).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Request failed (500)')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('renders cards in server order when no sortItems is given', async () => {
    mockGetCvWork.mockResolvedValue([
      { id: 'c', name: 'Gamma' },
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ]);

    const { container } = renderSection();

    await screen.findByText('Gamma');
    expect(cardTitles(container)).toEqual(['Gamma', 'Alpha', 'Beta']);
    expect(screen.queryByText(NO_ENTRIES)).not.toBeInTheDocument();
  });

  it('renders cards ordered by sortItems when given', async () => {
    mockGetCvWork.mockResolvedValue([
      { id: 'c', name: 'Gamma' },
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ]);

    const { container } = renderSection({ sortItems: byNameAsc });

    await screen.findByText('Gamma');
    expect(cardTitles(container)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('renders each card from its own item cache entry', async () => {
    mockGetCvWork.mockResolvedValue(threeItems);

    const { queryClient } = renderSection();
    await screen.findByText('Beta');

    act(() => {
      queryClient.setQueryData(cvKeys.sectionItem(CV, 'work', 'b'), { id: 'b', name: 'Beta 2' });
    });

    expect(await screen.findByText('Beta 2')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});

describe('ManagedArraySection stability (REQ-EDIT-009)', () => {
  it('keeps entries when the CV header is reloaded', async () => {
    mockGetCvWork.mockResolvedValue(threeItems);
    mockGetCv.mockResolvedValue({ id: CV, title: 'T', data: { basics: { name: 'Jane' } } });

    const { container, queryClient } = renderSection();
    await screen.findByText('Gamma');
    queryClient.setQueryData(cvKeys.detail(CV), { id: CV, title: 'T', data: { basics: {} } });

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: cvKeys.detail(CV) });
      queryClient.setQueryData(cvKeys.detail(CV), {
        id: CV,
        title: 'T2',
        data: { basics: { name: 'Jane' } },
      });
    });

    expect(cardTitles(container)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(screen.queryByText(NO_ENTRIES)).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: LOADING_LABEL })).not.toBeInTheDocument();
    expect(mockGetCvWork).toHaveBeenCalledTimes(1);
  });

  it('keeps entries when another section is saved or reloaded', async () => {
    mockGetCvWork.mockResolvedValue(threeItems);
    mockGetCvVolunteer.mockResolvedValue([]);

    const { container, queryClient } = renderSection();
    await screen.findByText('Gamma');
    queryClient.setQueryData(cvKeys.sectionList(CV, 'volunteer'), [{ id: 'v1' }]);

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: cvKeys.sectionList(CV, 'volunteer') });
      queryClient.setQueryData(cvKeys.sectionList(CV, 'volunteer'), []);
    });

    expect(cardTitles(container)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(screen.queryByText(NO_ENTRIES)).not.toBeInTheDocument();
    expect(mockGetCvWork).toHaveBeenCalledTimes(1);
  });

  it('keeps showing entries, without a skeleton, while its own list reloads', async () => {
    const reload = deferred<TestItem[]>();
    mockGetCvWork.mockResolvedValueOnce(threeItems).mockReturnValueOnce(reload.promise);

    const { container, queryClient } = renderSection();
    await screen.findByText('Gamma');

    act(() => {
      void queryClient.invalidateQueries({ queryKey: cvKeys.sectionList(CV, 'work') });
    });

    await waitFor(() => expect(mockGetCvWork).toHaveBeenCalledTimes(2));
    expect(cardTitles(container)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(screen.queryByRole('status', { name: LOADING_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByText(NO_ENTRIES)).not.toBeInTheDocument();

    await act(async () => {
      reload.resolve(threeItems);
      await reload.promise;
    });
  });
});

describe('ManagedArraySection edit, create, delete', () => {
  it('saves an edit and shows the server version of the entry', async () => {
    mockGetCvWork.mockResolvedValue(threeItems);
    const api = makeApi();
    api.update.mockResolvedValue({ item: { id: 'b', name: 'Beta (server)' } });

    const { container, queryClient } = renderSection({ api });
    await screen.findByText('Beta');

    fireEvent.click(within(rowFor(container, 'Beta')).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Beta draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Beta (server)')).toBeInTheDocument();
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(api.update).toHaveBeenCalledWith(
      CV,
      'b',
      expect.objectContaining({ name: 'Beta draft' }),
    );
    expect(screen.queryByText('Beta draft')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
    expect(cardTitles(container)).toEqual(['Alpha', 'Beta (server)', 'Gamma']);
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'b'))).toEqual(
      expect.objectContaining({ id: 'b', name: 'Beta (server)' }),
    );
    expect(
      (queryClient.getQueryData(cvKeys.sectionList(CV, 'work')) as TestItem[]).find(
        (item) => item.id === 'b',
      ),
    ).toEqual(expect.objectContaining({ name: 'Beta (server)' }));
  });

  it('re-sorts after an edit is saved, not while typing', async () => {
    mockGetCvWork.mockResolvedValue(threeItems);
    const api = makeApi();
    api.update.mockResolvedValue({ item: { id: 'a', name: 'Zeta' } });

    const { container } = renderSection({ api, sortItems: byNameAsc });
    await screen.findByText('Alpha');

    fireEvent.click(within(rowFor(container, 'Alpha')).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Zeta' },
    });

    // The form stays first while typing: the list does not re-sort under the cursor.
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(
      input.compareDocumentPosition(rowFor(container, 'Beta')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(cardTitles(container)).toEqual(['Beta', 'Gamma']);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText('Zeta');
    expect(cardTitles(container)).toEqual(['Beta', 'Gamma', 'Zeta']);
  });

  it('keeps the form open and shows the error when an edit fails', async () => {
    mockGetCvWork.mockResolvedValue(threeItems);
    const api = makeApi();
    api.update.mockRejectedValue(new Error('Update failed'));

    const { container, queryClient } = renderSection({ api });
    await screen.findByText('Beta');

    fireEvent.click(within(rowFor(container, 'Beta')).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Beta draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Update failed')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Beta draft');
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'b'))).toEqual({
      id: 'b',
      name: 'Beta',
    });
  });

  it('creates an entry, reloads the list from the server and closes the form', async () => {
    mockGetCvWork.mockResolvedValueOnce([{ id: 'a', name: 'Alpha' }]).mockResolvedValue([
      { id: 'a', name: 'Alpha' },
      { id: 'n', name: 'New (server)' },
    ]);
    const api = makeApi();
    api.create.mockResolvedValue({ item: { id: 'n', name: 'New (server)' } });

    const { container } = renderSection({ api });
    await screen.findByText('Alpha');

    fireEvent.click(screen.getByRole('button', { name: 'Add work' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'New draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('New (server)')).toBeInTheDocument();
    expect(api.create).toHaveBeenCalledWith(CV, expect.objectContaining({ name: 'New draft' }));
    // Initial load plus at least one reload after the create.
    expect(mockGetCvWork.mock.calls.length).toBeGreaterThanOrEqual(2);
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument(),
    );
    expect(cardTitles(container)).toEqual(['Alpha', 'New (server)']);
  });

  it('creates the first entry of an empty section', async () => {
    mockGetCvWork.mockResolvedValueOnce([]).mockResolvedValue([{ id: 'n', name: 'First' }]);
    const api = makeApi();
    api.create.mockResolvedValue({ item: { id: 'n', name: 'First' } });

    renderSection({ api });
    await screen.findByText(NO_ENTRIES);

    fireEvent.click(screen.getByRole('button', { name: 'Add work' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'First' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('First')).toBeInTheDocument();
    expect(screen.queryByText(NO_ENTRIES)).not.toBeInTheDocument();
  });

  it('does not call create when validation fails', async () => {
    mockGetCvWork.mockResolvedValue([]);
    const api = makeApi();

    renderSection({
      api,
      validateBeforeSave: (item) => (item.startDate ? null : { startDate: 'Required' }),
    });
    await screen.findByText(NO_ENTRIES);

    fireEvent.click(screen.getByRole('button', { name: 'Add work' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(api.create).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
  });

  it('deletes an entry after confirmation and removes it from the list', async () => {
    mockGetCvWork.mockResolvedValueOnce(threeItems).mockResolvedValue([
      { id: 'a', name: 'Alpha' },
      { id: 'c', name: 'Gamma' },
    ]);
    const api = makeApi();
    api.delete.mockResolvedValue({});

    const { container, queryClient } = renderSection({ api });
    await screen.findByText('Beta');

    fireEvent.click(within(rowFor(container, 'Beta')).getByRole('button', { name: 'Delete' }));
    expect(api.delete).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByText('Beta')).not.toBeInTheDocument());
    expect(api.delete).toHaveBeenCalledWith(CV, 'b');
    expect(cardTitles(container)).toEqual(['Alpha', 'Gamma']);
    expect(
      (queryClient.getQueryData(cvKeys.sectionList(CV, 'work')) as TestItem[]).map(
        (item) => item.id,
      ),
    ).toEqual(['a', 'c']);
  });

  it("removes the deleted entry's own cache key and keeps the others", async () => {
    mockGetCvWork.mockResolvedValueOnce(threeItems).mockResolvedValue([
      { id: 'a', name: 'Alpha' },
      { id: 'c', name: 'Gamma' },
    ]);
    const api = makeApi();
    api.delete.mockResolvedValue({});

    const { container, queryClient } = renderSection({ api });
    await screen.findByText('Beta');
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'b'))).toEqual({
      id: 'b',
      name: 'Beta',
    });

    fireEvent.click(within(rowFor(container, 'Beta')).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith(CV, 'b'));
    await waitFor(() => expect(cardTitles(container)).toEqual(['Alpha', 'Gamma']));
    await waitFor(() => expect(mockGetCvWork.mock.calls.length).toBeGreaterThanOrEqual(2));

    expect(queryClient.getQueryState(cvKeys.sectionItem(CV, 'work', 'b'))).toBeUndefined();
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'a'))).toEqual({
      id: 'a',
      name: 'Alpha',
    });
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'c'))).toEqual({
      id: 'c',
      name: 'Gamma',
    });
  });

  it('saves an edit with the typed values when the server response has no item', async () => {
    mockGetCvWork.mockResolvedValue(threeItems);
    const api = makeApi();
    api.update.mockResolvedValue({});

    const { container, queryClient } = renderSection({ api });
    await screen.findByText('Beta');

    fireEvent.click(within(rowFor(container, 'Beta')).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Beta draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Beta draft')).toBeInTheDocument();
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
    expect(cardTitles(container)).toEqual(['Alpha', 'Beta draft', 'Gamma']);
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'b'))).toEqual({
      id: 'b',
      name: 'Beta draft',
    });
    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'work'))).toEqual([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta draft' },
      { id: 'c', name: 'Gamma' },
    ]);
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'a'))).toEqual({
      id: 'a',
      name: 'Alpha',
    });
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'c'))).toEqual({
      id: 'c',
      name: 'Gamma',
    });
  });

  it('does not delete when the confirmation is cancelled', async () => {
    mockGetCvWork.mockResolvedValue(threeItems);
    const api = makeApi();

    const { container } = renderSection({ api });
    await screen.findByText('Beta');

    fireEvent.click(within(rowFor(container, 'Beta')).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    expect(api.delete).not.toHaveBeenCalled();
    expect(cardTitles(container)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('shows the last entry removed as the empty state after the server confirms', async () => {
    mockGetCvWork.mockResolvedValueOnce([{ id: 'a', name: 'Alpha' }]).mockResolvedValue([]);
    const api = makeApi();
    api.delete.mockResolvedValue({});

    const { container } = renderSection({ api });
    await screen.findByText('Alpha');

    fireEvent.click(within(rowFor(container, 'Alpha')).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(NO_ENTRIES)).toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });
});

describe('ManagedArraySection cross-section move', () => {
  const crossSectionMove = (onMove: (item: TestItem) => Promise<void>) => ({
    buttonLabel: 'Move to Volunteer',
    dialogTitle: 'Move to Volunteer?',
    dialogDescription: 'This entry will move.',
    confirmLabel: 'Move to Volunteer',
    successMessage: 'Moved',
    onMove,
  });

  it('shows move button on saved rows and opens confirmation dialog', async () => {
    mockGetCvWork.mockResolvedValue([{ id: 'w1', name: 'Acme', startDate: '2020-01' }]);
    const onMove = vi.fn().mockResolvedValue(undefined);

    renderSection({ crossSectionMove: crossSectionMove(onMove) });

    fireEvent.click(await screen.findByRole('button', { name: 'Move to Volunteer' }));
    expect(screen.getByRole('heading', { name: 'Move to Volunteer?' })).toBeTruthy();

    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Move to Volunteer' }),
    );

    await waitFor(() => {
      expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1', name: 'Acme' }));
    });
  });

  it('does not show move button on create draft', async () => {
    mockGetCvWork.mockResolvedValue([]);

    renderSection({
      createEmpty: () => ({ startDate: '2024-01' }),
      renderForm: (_item, _onChange, context) => (
        <div>{context?.mode === 'create' ? 'Create draft' : 'Edit draft'}</div>
      ),
      crossSectionMove: crossSectionMove(vi.fn()),
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Add work' }));
    expect(screen.getByText('Create draft')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move to Volunteer' })).toBeNull();
  });
});
