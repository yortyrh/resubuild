// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CountryCodeField } from './country-code-field';

describe('CountryCodeField', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders empty trigger when value is null', () => {
    render(<CountryCodeField value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Country, choose country/i })).toHaveTextContent(
      'Select country…',
    );
  });

  it('displays country name when value is a known code', () => {
    render(<CountryCodeField value="US" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Country, choose country/i })).toHaveTextContent(
      'United States',
    );
  });
});
