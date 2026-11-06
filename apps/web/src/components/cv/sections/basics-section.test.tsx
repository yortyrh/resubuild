// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetCv = vi.fn();
const mockPatchCvBasics = vi.fn();

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/components/cv/cv-editor-provider', () => ({
  useCvEditor: () => ({ cvId: 'cv-1', mountedSection: null, setMountedSection: vi.fn() }),
}));

vi.mock('@/components/cv/use-section-mount', () => ({
  useSectionMount: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getCv: (...args: unknown[]) => mockGetCv(...args),
  };
});

vi.mock('@/lib/cv-item-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/cv-item-api')>();
  return {
    ...actual,
    patchCvBasics: (...args: unknown[]) => mockPatchCvBasics(...args),
  };
});

import { cvKeys } from '@/lib/queries/keys';
import { renderWithQueryClient } from '@/lib/queries/test-utils';
import { BasicsSection } from './basics-section';

beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const cvRecord = {
  id: 'cv-1',
  user_id: 'u1',
  title: 'Engineer CV',
  templateId: 'modern',
  data: {
    basics: { name: 'Jane Doe', email: 'jane@example.com' },
    meta: { version: '1' },
  },
  created_at: 'c',
  updated_at: 'u',
};

describe('BasicsSection', () => {
  beforeEach(() => {
    mockGetCv.mockReset();
    mockPatchCvBasics.mockReset();
  });

  afterEach(() => cleanup());

  it('shows a loading placeholder until the CV header has loaded', () => {
    mockGetCv.mockReturnValue(new Promise(() => undefined));

    renderWithQueryClient(<BasicsSection />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Untitled')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('reads basics from the CV header query', async () => {
    mockGetCv.mockResolvedValue(cvRecord);

    renderWithQueryClient(<BasicsSection />);

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(mockGetCv).toHaveBeenCalledWith('cv-1');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('follows the cached CV header when it changes', async () => {
    mockGetCv.mockResolvedValue(cvRecord);

    const { queryClient } = renderWithQueryClient(<BasicsSection />);
    await screen.findByText('Jane Doe');

    act(() => {
      queryClient.setQueryData(cvKeys.detail('cv-1'), {
        ...cvRecord,
        data: { ...cvRecord.data, basics: { name: 'Janet Doe' } },
      });
    });

    expect(await screen.findByText('Janet Doe')).toBeInTheDocument();
  });

  it('saves basics and writes them into the CV header cache', async () => {
    mockGetCv.mockResolvedValue(cvRecord);
    mockPatchCvBasics.mockResolvedValue({});

    const { queryClient } = renderWithQueryClient(<BasicsSection />);
    await screen.findByText('Jane Doe');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Janet Doe' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Janet Doe')).toBeInTheDocument();
    expect(mockPatchCvBasics).toHaveBeenCalledWith(
      'cv-1',
      expect.objectContaining({ name: 'Janet Doe', email: 'jane@example.com' }),
    );

    await waitFor(() => {
      const cached = queryClient.getQueryData<typeof cvRecord>(cvKeys.detail('cv-1'));
      expect(cached?.data.basics).toEqual(
        expect.objectContaining({ name: 'Janet Doe', email: 'jane@example.com' }),
      );
    });
    const cached = queryClient.getQueryData<typeof cvRecord>(cvKeys.detail('cv-1'));
    expect(cached?.title).toBe('Engineer CV');
    expect(cached?.templateId).toBe('modern');
    expect(cached?.data.meta).toEqual({ version: '1' });
  });

  it('leaves the CV header cache unchanged when saving fails', async () => {
    mockGetCv.mockResolvedValue(cvRecord);
    mockPatchCvBasics.mockRejectedValue(new Error('Save failed (500)'));

    const { queryClient } = renderWithQueryClient(<BasicsSection />);
    await screen.findByText('Jane Doe');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Janet Doe' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Save failed (500)')).toBeInTheDocument();
    const cached = queryClient.getQueryData<typeof cvRecord>(cvKeys.detail('cv-1'));
    expect(cached?.data.basics).toEqual({ name: 'Jane Doe', email: 'jane@example.com' });
  });
});
