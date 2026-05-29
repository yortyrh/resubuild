// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryProvider } from '@/components/providers/query-provider';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockDeleteCv = vi.fn();
const mockListCvs = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    listCvs: (...args: unknown[]) => mockListCvs(...args),
    deleteCv: (...args: unknown[]) => mockDeleteCv(...args),
  };
});

import { CvList } from '@/components/dashboard/cv-list';

function renderCvList() {
  return render(
    <QueryProvider>
      <CvList />
    </QueryProvider>,
  );
}

describe('CvList', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads and displays CVs', async () => {
    mockListCvs.mockResolvedValue([
      {
        id: 'cv-1',
        title: 'Engineer CV',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    renderCvList();

    const titleLink = await screen.findByRole('link', { name: 'Engineer CV' });
    expect(titleLink).toHaveAttribute('href', '/dashboard/cv/cv-1');
  });
});
