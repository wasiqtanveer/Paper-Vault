import { useContext } from 'react';
import { SoundContext } from './sound-context';

export function useSound() {
  // Safe outside the provider: components can call play() unconditionally.
  return useContext(SoundContext) ?? { enabled: false, setEnabled: () => {}, toggle: () => {}, play: () => {} };
}
