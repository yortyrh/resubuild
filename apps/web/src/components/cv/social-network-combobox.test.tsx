// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SocialNetworkCombobox } from './social-network-combobox';

describe('SocialNetworkCombobox', () => {
  afterEach(() => cleanup());

  it('renders empty input when value is null', () => {
    render(<SocialNetworkCombobox value={null} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/LinkedIn/i)).toHaveValue('');
  });

  it('commits custom network on blur', () => {
    const onChange = vi.fn();
    render(<SocialNetworkCombobox value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText(/LinkedIn/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'My Blog' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('My Blog');
  });

  it('filters suggestions while typing', async () => {
    const user = userEvent.setup();
    render(<SocialNetworkCombobox value="" onChange={vi.fn()} />);

    const input = screen.getByPlaceholderText(/LinkedIn/i);
    await user.click(input);
    await user.type(input, 'git');

    expect(screen.getByRole('option', { name: /GitHub/i })).toBeInTheDocument();
  });

  it('selects suggestion on click', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SocialNetworkCombobox value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText(/LinkedIn/i);
    await user.click(input);
    await user.click(screen.getByRole('option', { name: /^LinkedIn$/ }));

    expect(onChange).toHaveBeenCalledWith('LinkedIn');
  });
});
