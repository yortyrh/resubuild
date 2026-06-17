// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataTable } from './application-data-table';
import {
  type ApplicationRow,
  getApplicationColumns,
  toApplicationRow,
} from './application-data-table-columns';

const sampleApplication = {
  id: 'app-1',
  status: 'ready' as const,
  jobTitle: 'Engineer',
  jobCompany: 'Acme',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const sampleApplicationNoCompany = {
  ...sampleApplication,
  id: 'app-2',
  jobCompany: null,
};

const sampleApplicationUpdating = {
  ...sampleApplication,
  id: 'app-3',
  updateInProgress: true,
};

function renderTable(
  rows: ApplicationRow[],
  overrides: Partial<Parameters<typeof getApplicationColumns>[0]> = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onUpdate = vi.fn();
  const onDelete = vi.fn();
  const onExportCvPdf = vi.fn();
  const onExportLetterPdf = vi.fn();
  const onPreviewCv = vi.fn();
  const columns = getApplicationColumns({
    onUpdate,
    onDelete,
    onExportCvPdf,
    onExportLetterPdf,
    onPreviewCv,
    exportingCvPdfFor: null,
    exportingLetterPdfFor: null,
    ...overrides,
  });
  const utils = render(
    <QueryClientProvider client={client}>
      <DataTable columns={columns} data={rows} caption="Applications" />
    </QueryClientProvider>,
  );
  return {
    ...utils,
    onUpdate,
    onDelete,
    onExportCvPdf,
    onExportLetterPdf,
    onPreviewCv,
  };
}

describe('application-data-table', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the expected column headers in order', () => {
    renderTable([toApplicationRow(sampleApplication)]);
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Company', 'Position', 'Application status', 'Actions']);
  });

  it('renders the company as "—" when the API row has no company', () => {
    renderTable([toApplicationRow(sampleApplicationNoCompany)]);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders "Preparing…" for the position cell when the title is missing', () => {
    const noTitle = { ...sampleApplication, jobTitle: null };
    renderTable([toApplicationRow(noTitle)]);
    expect(screen.getByText('Preparing…')).toBeInTheDocument();
  });

  it('shows the "Update in progress" region when updateInProgress is true', () => {
    renderTable([toApplicationRow(sampleApplicationUpdating)]);
    expect(screen.getByLabelText('Update in progress')).toBeInTheDocument();
  });

  it('renders the company and position cells as links to the application workspace', () => {
    renderTable([toApplicationRow(sampleApplication)]);

    const companyLink = screen.getByRole('link', { name: 'Acme' });
    expect(companyLink).toHaveAttribute('href', '/dashboard/applications/app-1');
    // The link should be visually distinct (text-primary + underline) so it
    // reads as clickable, not just on hover.
    expect(companyLink).toHaveClass('text-primary');
    expect(companyLink.className).toContain('underline');

    const positionLink = screen.getByRole('link', { name: 'Engineer' });
    expect(positionLink).toHaveAttribute('href', '/dashboard/applications/app-1');
    expect(positionLink.className).toContain('underline');
  });

  it('opens a 3-dots menu with Export CV as PDF, Export cover letter as PDF, Preview CV, and Delete', async () => {
    const user = userEvent.setup();
    const readyWithCv = { ...sampleApplication, tailoredCvId: 'cv-1' };
    renderTable([toApplicationRow(readyWithCv)]);

    const trigger = await screen.findByRole('button', { name: 'Open Engineer application' });
    await user.click(trigger);

    expect(await screen.findByRole('menuitem', { name: /Export CV as PDF/ })).toBeInTheDocument();
    expect(
      await screen.findByRole('menuitem', { name: /Export cover letter as PDF/ }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: /^Preview CV$/ })).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: /^Delete$/ })).toBeInTheDocument();
  });

  it('disables Preview CV and Export CV as PDF when the application has no tailoredCvId', async () => {
    const user = userEvent.setup();
    renderTable([toApplicationRow(sampleApplication)]);

    const trigger = await screen.findByRole('button', { name: 'Open Engineer application' });
    await user.click(trigger);

    const preview = await screen.findByRole('menuitem', { name: /^Preview CV$/ });
    expect(preview).toHaveAttribute('data-disabled');

    const exportCv = await screen.findByRole('menuitem', { name: /Export CV as PDF/ });
    expect(exportCv).toHaveAttribute('data-disabled');

    // The cover letter export is independent of the tailored CV, so it stays enabled.
    const exportLetter = await screen.findByRole('menuitem', {
      name: /Export cover letter as PDF/,
    });
    expect(exportLetter).not.toHaveAttribute('data-disabled');
  });

  it('invokes onPreviewCv with the application row when Preview CV is clicked', async () => {
    const user = userEvent.setup();
    const readyWithCv = { ...sampleApplication, tailoredCvId: 'cv-1' };
    const { onPreviewCv } = renderTable([toApplicationRow(readyWithCv)]);

    const trigger = await screen.findByRole('button', { name: 'Open Engineer application' });
    await user.click(trigger);

    await user.click(await screen.findByRole('menuitem', { name: /^Preview CV$/ }));

    expect(onPreviewCv).toHaveBeenCalledTimes(1);
    expect(onPreviewCv.mock.calls[0][0].id).toBe('app-1');
  });

  it('invokes onExportCvPdf from its menu item', async () => {
    const user = userEvent.setup();
    const readyWithCv = { ...sampleApplication, tailoredCvId: 'cv-1' };
    const { onExportCvPdf } = renderTable([toApplicationRow(readyWithCv)]);

    const trigger = await screen.findByRole('button', { name: 'Open Engineer application' });
    await user.click(trigger);

    await user.click(await screen.findByRole('menuitem', { name: /Export CV as PDF/ }));

    expect(onExportCvPdf).toHaveBeenCalledTimes(1);
    expect(onExportCvPdf.mock.calls[0][0].id).toBe('app-1');
  });

  it('invokes onExportLetterPdf from its menu item', async () => {
    const user = userEvent.setup();
    const readyWithCv = { ...sampleApplication, tailoredCvId: 'cv-1' };
    const { onExportLetterPdf } = renderTable([toApplicationRow(readyWithCv)]);

    const trigger = await screen.findByRole('button', { name: 'Open Engineer application' });
    await user.click(trigger);

    await user.click(await screen.findByRole('menuitem', { name: /Export cover letter as PDF/ }));

    expect(onExportLetterPdf).toHaveBeenCalledTimes(1);
    expect(onExportLetterPdf.mock.calls[0][0].id).toBe('app-1');
  });

  it('still invokes onDelete from the menu', async () => {
    const user = userEvent.setup();
    const readyWithCv = { ...sampleApplication, tailoredCvId: 'cv-1' };
    const { onDelete } = renderTable([toApplicationRow(readyWithCv)]);

    const trigger = await screen.findByRole('button', { name: 'Open Engineer application' });
    await user.click(trigger);

    await user.click(await screen.findByRole('menuitem', { name: /^Delete$/ }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0][0].id).toBe('app-1');
  });
});
