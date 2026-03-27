export interface VideoState {
  src: string | null;
  fileName: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  syncPoint: number | null;
}

export type Theme = 'dark' | 'light';

export type Side = 'left' | 'right';
