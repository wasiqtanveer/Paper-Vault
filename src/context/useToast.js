import { useContext } from 'react';
import { ToastContext } from './toast-context';

export function useToast() {
  return useContext(ToastContext);
}
