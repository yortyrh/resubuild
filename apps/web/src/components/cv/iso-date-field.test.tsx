// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IsoDateField } from './iso-date-field';

describe('IsoDateField', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders empty month input when value is null', () => {
    render(<IsoDateField label="Start date" value={null} onChange={vi.fn()} />);
    const monthInput = document.querySelector('input[type="month"]');
    expect(monthInput).toBeTruthy();
    expect(monthInput).toHaveValue('');
  });

  it('renders year input with value when precision is year', () => {
    render(
      <IsoDateField label="Start date" value="2020" onChange={vi.fn()} defaultPrecision="year" />,
    );
    expect(screen.getByPlaceholderText('YYYY')).toHaveValue(2020);
  });
});
