import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NumberField from './NumberField';

function Harness({ initial = 5, ...props }) {
  const [v, setV] = useState(initial);
  return <NumberField aria-label="Qty" value={v} onChange={e => setV(e.target.value)} {...props} />;
}

const steppers = container => container.querySelectorAll('.numfield-step');

describe('NumberField min/max clamping', () => {
  it('increments and decrements with the steppers', () => {
    const { container } = render(<Harness initial={5} min={0} max={10} />);
    const [up, down] = steppers(container);
    fireEvent.click(up);
    expect(screen.getByLabelText('Qty')).toHaveValue(6);
    fireEvent.click(down);
    fireEvent.click(down);
    expect(screen.getByLabelText('Qty')).toHaveValue(4);
  });

  it('disables the up stepper at max and the down stepper at min', () => {
    const { container, rerender } = render(<NumberField aria-label="Qty" value={10} onChange={() => {}} min={0} max={10} />);
    let [up, down] = steppers(container);
    expect(up).toBeDisabled();
    expect(down).not.toBeDisabled();

    rerender(<NumberField aria-label="Qty" value={0} onChange={() => {}} min={0} max={10} />);
    [up, down] = steppers(container);
    expect(up).not.toBeDisabled();
    expect(down).toBeDisabled();
  });

  it('never steps past the bounds', () => {
    const { container } = render(<Harness initial={9} min={0} max={10} step={5} />);
    const [up] = steppers(container);
    fireEvent.click(up);
    expect(Number(screen.getByLabelText('Qty').value)).toBeLessThanOrEqual(10);
  });

  it('leaves both steppers enabled without min or max', () => {
    const { container } = render(<NumberField aria-label="Qty" value={3} onChange={() => {}} />);
    const [up, down] = steppers(container);
    expect(up).not.toBeDisabled();
    expect(down).not.toBeDisabled();
  });

  it('disables everything when disabled', () => {
    const { container } = render(<NumberField aria-label="Qty" value={3} onChange={() => {}} disabled />);
    const [up, down] = steppers(container);
    expect(screen.getByLabelText('Qty')).toBeDisabled();
    expect(up).toBeDisabled();
    expect(down).toBeDisabled();
  });

  it('passes min and max through to the input', () => {
    render(<NumberField aria-label="Qty" value={3} onChange={() => {}} min={1} max={9} />);
    const input = screen.getByLabelText('Qty');
    expect(input).toHaveAttribute('min', '1');
    expect(input).toHaveAttribute('max', '9');
  });
});
