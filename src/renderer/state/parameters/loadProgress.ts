import { create } from 'zustand';
import type { LoadProgress } from '../../utils/progress';

export const NO_PROGRESS: LoadProgress = {
  found: 0,
  listed: false,
  valuesDone: 0
};

// How far the latest load has got, for a progress message on slow loads.
export const useLoadProgress = create<LoadProgress>()(() => NO_PROGRESS);
