import { useState } from 'react';
import './RejectReasonForm.css';

export const REJECT_REASON_MAX = 200;

const QUICK_REASONS = [
  'Blurry or unreadable',
  'Cropped or incomplete',
  'Wrong subject or details',
  'Duplicate of an existing paper',
  'Not a past paper',
];

// Shared by the moderation queue and the paper page so both ask for the same
// thing: the uploader sees this text, so a reason is required, not optional.
export default function RejectReasonForm({ onConfirm, onCancel, busy = false }) {
  const [reason, setReason] = useState('');

  function submit(e) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <form className="reject-form" onSubmit={submit}>
      <div className="reject-chips">
        {QUICK_REASONS.map(r => (
          <button
            key={r} type="button"
            className={'reject-chip' + (reason === r ? ' active' : '')}
            onClick={() => setReason(r)}
          >
            {r}
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        value={reason}
        maxLength={REJECT_REASON_MAX}
        onChange={e => setReason(e.target.value)}
        placeholder="Why is it being rejected? The uploader will see this."
        autoFocus
      />
      <div className="reject-actions">
        <button type="submit" className="btn btn-danger btn-sm" disabled={busy || !reason.trim()}>
          {busy ? 'Rejecting…' : 'Reject paper'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
