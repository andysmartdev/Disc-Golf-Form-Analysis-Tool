import { useRef, useState, useCallback, useEffect } from 'react';

export interface VideoPlayerControls {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  src: string | null;
  fileName: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  syncPoint: number | null;
  loadFile: (file: File) => void;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setSyncPoint: () => void;
  clearSyncPoint: () => void;
  reset: () => void;
}

export function useVideoPlayer(): VideoPlayerControls {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [syncPoint, setSyncPointState] = useState<number | null>(null);

  // Re-run when src changes: the <video> element only exists when src is truthy,
  // so we need to (re-)attach listeners each time it appears or swaps.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate    = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(isFinite(video.duration) ? video.duration : 0);
    const onPlay          = () => setIsPlaying(true);
    const onPause         = () => setIsPlaying(false);
    const onEnded         = () => setIsPlaying(false);
    const onError         = () => { setIsPlaying(false); setDuration(0); };

    // Recover from a stalled decode pipeline: reload source, seek back, resume.
    const onStalled = () => {
      if (!video.src) return;
      const t = video.currentTime;
      const wasPlaying = !video.paused;
      video.load();
      video.currentTime = t;
      if (wasPlaying) video.play().catch(() => {});
    };

    video.addEventListener('timeupdate',     onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('loadedmetadata', onDurationChange);
    video.addEventListener('play',           onPlay);
    video.addEventListener('pause',          onPause);
    video.addEventListener('ended',          onEnded);
    video.addEventListener('stalled',        onStalled);
    video.addEventListener('error',          onError);

    return () => {
      video.removeEventListener('timeupdate',     onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('loadedmetadata', onDurationChange);
      video.removeEventListener('play',           onPlay);
      video.removeEventListener('pause',          onPause);
      video.removeEventListener('ended',          onEnded);
      video.removeEventListener('stalled',        onStalled);
      video.removeEventListener('error',          onError);
    };
  }, [src]);

  const loadFile = useCallback((file: File) => {
    const v = videoRef.current;
    // Explicitly pause before changing src so no stale play promise is in flight.
    if (v) v.pause();

    const url = URL.createObjectURL(file);
    setSrc(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setFileName(file.name);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSyncPointState(null);
    setPlaybackRateState(1);
    if (v) v.playbackRate = 1;
  }, []);

  // Videos are always muted (no audio needed for form analysis, and iOS Safari
  // won't allow two unmuted videos to play simultaneously). play() returns a
  // Promise so callers can use Promise.all() for coordinated dual-video starts.
  const play = useCallback((): Promise<void> => {
    const v = videoRef.current;
    if (!v) return Promise.resolve();
    return v.play().catch(() => {});
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(time, v.duration || 0));
    setCurrentTime(v.currentTime);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  }, []);

  const setSyncPoint = useCallback(() => {
    const v = videoRef.current;
    if (v) setSyncPointState(v.currentTime);
  }, []);

  const clearSyncPoint = useCallback(() => setSyncPointState(null), []);

  const reset = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
      v.playbackRate = 1;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackRateState(1);
    setSyncPointState(null);
  }, []);

  return {
    videoRef,
    src,
    fileName,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    syncPoint,
    loadFile,
    play,
    pause,
    togglePlay,
    seek,
    setPlaybackRate,
    setSyncPoint,
    clearSyncPoint,
    reset,
  };
}
