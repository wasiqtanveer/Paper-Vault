import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomSelect from './CustomSelect';

const options = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
];

beforeAll(() => {
  // jsdom does not implement scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});

function setup(props = {}) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<CustomSelect value="" onChange={onChange} options={options} ariaLabel="Fruit" {...props} />);
  const trigger = screen.getByRole('combobox', { name: 'Fruit' });
  return { onChange, user, trigger };
}

describe('CustomSelect keyboard navigation', () => {
  it('shows the placeholder, then opens with ArrowDown', async () => {
    const { user, trigger } = setup();
    expect(trigger).toHaveTextContent('Select…');
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('moves the active option with arrows, Home and End, then selects with Enter', async () => {
    const { user, trigger, onChange } = setup();
    trigger.focus();
    await user.keyboard('{Enter}');
    const active = () => trigger.getAttribute('aria-activedescendant');
    const idOf = i => screen.getAllByRole('option')[i].id;

    expect(active()).toBe(idOf(0));
    await user.keyboard('{ArrowDown}');
    expect(active()).toBe(idOf(1));
    await user.keyboard('{End}');
    expect(active()).toBe(idOf(2));
    await user.keyboard('{ArrowDown}');
    expect(active()).toBe(idOf(2)); // clamped at the end
    await user.keyboard('{Home}');
    expect(active()).toBe(idOf(0));
    await user.keyboard('{ArrowUp}');
    expect(active()).toBe(idOf(0)); // clamped at the start

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('selects with Space when not searchable', async () => {
    const { user, trigger, onChange } = setup();
    trigger.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown} ');
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('closes on Escape without changing the value', async () => {
    const { user, trigger, onChange } = setup();
    trigger.focus();
    await user.keyboard('{Enter}{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('starts on the currently selected option', async () => {
    const { user, trigger } = setup({ value: 'c' });
    expect(trigger).toHaveTextContent('Cherry');
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(trigger.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[2].id);
  });
});

describe('CustomSelect search', () => {
  it('filters options as the user types in the search box', async () => {
    const { user, trigger } = setup({ searchable: true });
    await user.click(trigger);
    await user.type(screen.getByLabelText('Search options'), 'an');
    const opts = screen.getAllByRole('option');
    expect(opts).toHaveLength(1);
    expect(opts[0]).toHaveTextContent('Banana');
  });

  it('shows "No results" when nothing matches', async () => {
    const { user, trigger } = setup({ searchable: true });
    await user.click(trigger);
    await user.type(screen.getByLabelText('Search options'), 'zzz');
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('opens and seeds the query when typing on the closed trigger', async () => {
    const { user, trigger } = setup({ searchable: true });
    trigger.focus();
    await user.keyboard('c');
    expect(screen.getByLabelText('Search options')).toHaveValue('c');
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['Cherry']);
  });

  it('selects the first filtered option with Enter', async () => {
    const { user, trigger, onChange } = setup({ searchable: true });
    await user.click(trigger);
    await user.type(screen.getByLabelText('Search options'), 'che{Enter}');
    expect(onChange).toHaveBeenCalledWith('c');
  });
});
