import { useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import './NumberField.css';

/**
 * NumberField – a number input with drawn steppers.
 *
 * The native `<input type="number">` spinner is painted by the browser, not by
 * this design system: it ignores the surrounding palette entirely and renders a
 * pale chip on our dark surfaces. It is also ~10px of hit area, aimed at a mouse
 * and invisible on touch. This replaces it with steppers built from the same
 * icon set, tokens, and hover language as CustomSelect, which sits beside it in
 * every layout that uses this.
 *
 * Typing, arrow keys, `min`/`max` clamping, and form validation all stay native.
 */
export default function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  'aria-label': ariaLabel,
  ...rest
}) {
  const inputRef = useRef(null);

  // Drive the real input rather than computing values by hand, so `min`/`max`
  // clamping and validity stay the browser's job. requestSubmit-free: stepUp
  // does not emit `input`, so the change is forwarded manually.
  function nudge(direction) {
    const el = inputRef.current;
    if (!el || disabled) return;
    if (direction > 0) el.stepUp();
    else el.stepDown();
    onChange?.({ target: el, currentTarget: el });
    el.focus();
  }

  const atMin = min != null && Number(value) <= Number(min);
  const atMax = max != null && Number(value) >= Number(max);

  return (
    <div className={`numfield${disabled ? ' numfield-disabled' : ''}`}>
      <input
        ref={inputRef}
        type="number"
        className="numfield-input"
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={ariaLabel}
        {...rest}
      />
      {/* Steppers are a redundant affordance — the input is typeable and takes
          arrow keys — so they stay out of the tab order and off the a11y tree
          rather than adding two stops to every form. */}
      <span className="numfield-steppers" aria-hidden="true">
        <button
          type="button"
          className="numfield-step"
          tabIndex={-1}
          disabled={disabled || atMax}
          onClick={() => nudge(1)}
        >
          <ChevronUp size={11} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className="numfield-step"
          tabIndex={-1}
          disabled={disabled || atMin}
          onClick={() => nudge(-1)}
        >
          <ChevronDown size={11} strokeWidth={2.5} />
        </button>
      </span>
    </div>
  );
}
