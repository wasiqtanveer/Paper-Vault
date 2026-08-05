import { createRoot } from 'react-dom/client';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * Styled replacement for window.confirm.
 *
 *   if (!(await confirmDialog({ title: 'Delete paper?', body: `"${paper.title}" …`, confirmLabel: 'Delete' }))) return;
 *
 * Lives outside the component file so that file only exports a component and
 * keeps React fast refresh working.
 */
export function confirmDialog(opts) {
  return new Promise(resolve => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const previouslyFocused = document.activeElement;
    const done = result => {
      root.unmount();
      host.remove();
      previouslyFocused?.focus?.();
      resolve(result);
    };
    root.render(<ConfirmDialog {...opts} onDone={done} />);
  });
}
