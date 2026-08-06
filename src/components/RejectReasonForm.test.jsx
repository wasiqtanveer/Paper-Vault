import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RejectReasonForm, { REJECT_REASON_MAX } from './RejectReasonForm';

const submitBtn = () => screen.getByRole('button', { name: 'Reject paper' });
const box = () => screen.getByRole('textbox');

describe('RejectReasonForm validation', () => {
  it('disables submit while the reason is empty or whitespace', async () => {
    const user = userEvent.setup();
    render(<RejectReasonForm onConfirm={() => {}} onCancel={() => {}} />);
    expect(submitBtn()).toBeDisabled();
    await user.type(box(), '    ');
    expect(submitBtn()).toBeDisabled();
  });

  it('does not call onConfirm when submitted empty (Enter in the form)', async () => {
    const onConfirm = vi.fn();
    const { container } = render(<RejectReasonForm onConfirm={onConfirm} onCancel={() => {}} />);
    container.querySelector('form').requestSubmit?.() ?? container.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms with the trimmed reason', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<RejectReasonForm onConfirm={onConfirm} onCancel={() => {}} />);
    await user.type(box(), '  Too blurry  ');
    await user.click(submitBtn());
    expect(onConfirm).toHaveBeenCalledWith('Too blurry');
  });

  it('fills the reason from a quick-reason chip', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<RejectReasonForm onConfirm={onConfirm} onCancel={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Not a past paper' }));
    expect(box()).toHaveValue('Not a past paper');
    await user.click(submitBtn());
    expect(onConfirm).toHaveBeenCalledWith('Not a past paper');
  });

  it('caps the reason at the maximum length', () => {
    render(<RejectReasonForm onConfirm={() => {}} onCancel={() => {}} />);
    expect(box()).toHaveAttribute('maxlength', String(REJECT_REASON_MAX));
    expect(REJECT_REASON_MAX).toBe(200);
  });

  it('truncates typed input beyond the maximum', async () => {
    const user = userEvent.setup();
    render(<RejectReasonForm onConfirm={() => {}} onCancel={() => {}} />);
    await user.click(box());
    await user.paste('x'.repeat(REJECT_REASON_MAX + 50));
    expect(box().value).toHaveLength(REJECT_REASON_MAX);
  });

  it('shows a busy state that disables both actions', () => {
    render(<RejectReasonForm onConfirm={() => {}} onCancel={() => {}} busy />);
    expect(screen.getByRole('button', { name: 'Rejecting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('calls onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<RejectReasonForm onConfirm={() => {}} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
