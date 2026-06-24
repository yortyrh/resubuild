// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type ApplicationRow,
  type ApplicationRowActions,
  toApplicationRow,
} from './application-data-table-columns';
import { ApplicationRowCard } from './application-row-card';

const baseApplication = {
  id: 'app-1',
  status: 'ready' as const,
  jobTitle: 'Engineer',
  jobCompany: 'Acme',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeActions(overrides: Partial<ApplicationRowActions> = {}): ApplicationRowActions {
  return {
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    onExportCvPdf: vi.fn(),
    onExportLetterPdf: vi.fn(),
    onPreviewCv: vi.fn(),
    exportingCvPdfFor: null,
    exportingLetterPdfFor: null,
    ...overrides,
  };
}

function renderCard(row: ApplicationRow, actions: ApplicationRowActions = makeActions()) {
  render(<ApplicationRowCard row={row} actions={actions} />);
  return actions;
}

describe('ApplicationRowCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the company, position, and status inside a surface-soft card', () => {
    renderCard(toApplicationRow(baseApplication));

    const card = screen.getByTestId('application-row-card');
    expect(card.className).toContain('surface-soft');
    expect(card.className).toContain('text-card-foreground');

    const companyLink = within(card).getByRole('link', { name: 'Acme' });
    expect(companyLink).toHaveAttribute('href', '/dashboard/applications/app-1');
    expect(companyLink.className).toContain('text-primary');

    const positionLink = within(card).getByRole('link', { name: 'Engineer' });
    expect(positionLink).toHaveAttribute('href', '/dashboard/applications/app-1');

    expect(within(card).getByText('Ready')).toBeInTheDocument();
  });

  it('uses surface-soft for the card chrome, never bare border or rounded-lg', () => {
    renderCard(toApplicationRow(baseApplication));
    const card = screen.getByTestId('application-row-card');
    expect(card.className).toContain('surface-soft');
    expect(card.className).not.toMatch(/(^|\s)border(\s|$)/);
    expect(card.className).not.toMatch(/(^|\s)rounded-(md|lg|xl)(\s|$)/);
  });

  it('shows "—" for company and "Preparing…" for position when the API row is missing both', () => {
    const row = toApplicationRow({ ...baseApplication, jobCompany: null, jobTitle: null });
    renderCard(row);
    const card = screen.getByTestId('application-row-card');
    expect(within(card).getByText('—')).toBeInTheDocument();
    expect(within(card).getByText('Preparing…')).toBeInTheDocument();
  });

  it('renders the updating indicator and a disabled Update button while an update is in progress', () => {
    const row = toApplicationRow({ ...baseApplication, updateInProgress: true });
    renderCard(row);
    const card = screen.getByTestId('application-row-card');
    expect(within(card).getByLabelText('Update in progress')).toBeInTheDocument();
    const updateButton = within(card).getByRole('button', {
      name: 'Update Engineer application',
    });
    expect(updateButton).toBeDisabled();
    expect(updateButton).toHaveTextContent('Updating…');
  });

  it('invokes onUpdate when the card Update button is clicked', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    renderCard(toApplicationRow(baseApplication), actions);
    const card = screen.getByTestId('application-row-card');
    await user.click(within(card).getByRole('button', { name: 'Update Engineer application' }));
    expect(actions.onUpdate).toHaveBeenCalledTimes(1);
    const mock = actions.onUpdate as unknown as { mock: { calls: unknown[][] } };
    expect(mock.mock.calls[0][0]).toMatchObject({ id: 'app-1' });
  });

  it('reuses the same 3-dots menu (export / preview / delete) as the table row', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    const readyWithCv = { ...baseApplication, tailoredCvId: 'cv-1' };
    renderCard(toApplicationRow(readyWithCv), actions);

    const card = screen.getByTestId('application-row-card');
    const trigger = within(card).getByRole('button', { name: 'Open Engineer application' });
    await user.click(trigger);

    expect(await screen.findByRole('menuitem', { name: /Export CV as PDF/ })).toBeInTheDocument();
    expect(
      await screen.findByRole('menuitem', { name: /Export cover letter as PDF/ }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: /^Preview CV$/ })).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: /^Delete$/ })).toBeInTheDocument();
  });

  it('invokes onDelete from the card menu', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    const readyWithCv = { ...baseApplication, tailoredCvId: 'cv-1' };
    renderCard(toApplicationRow(readyWithCv), actions);
    const card = screen.getByTestId('application-row-card');
    await user.click(within(card).getByRole('button', { name: 'Open Engineer application' }));
    await user.click(await screen.findByRole('menuitem', { name: /^Delete$/ }));
    expect(actions.onDelete).toHaveBeenCalledTimes(1);
  });
});
