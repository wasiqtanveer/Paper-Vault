import { describe, it, expect, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { confirmDialog } from './confirmDialog';

afterEach(() => { document.body.innerHTML = ''; });

const open = opts => {
  let promise;
  act(() => { promise = confirmDialog({ title: 'Delete paper?', body: 'Gone for good.', confirmLabel: 'Delete', ...opts }); });
  return promise;
};

describe('confirmDialog', () => {
  it('shows the title and body and starts focus on Cancel', async () => {
    const p = open();
    expect(await screen.findByText('Delete paper?')).toBeInTheDocument();
    expect(screen.getByText('Gone for good.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await p;
  });

  it('resolves true when confirmed', async () => {
    const p = open();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await p).toBe(true);
  });

  it('resolves false on Cancel', async () => {
    const p = open();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(await p).toBe(false);
  });

  it('resolves false on Escape', async () => {
    const p = open();
    await screen.findByText('Delete paper?');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(await p).toBe(false);
  });

  it('removes itself from the page once answered', async () => {
    const p = open();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await p;
    await waitFor(() => expect(screen.queryByText('Delete paper?')).toBeNull());
  });
});
