import { useContext } from 'react';
import { SoundContext } from './sound-context';

export function useSound() {
  return useContext(SoundContext);
}
