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
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setSyncPoint: () => void;
  clearSyncPoint: () => void;
  setCurrentTime: (t: number) => void;
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('loadedmetadata', onDurationChange);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('loadedmetadata', onDurationChange);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const loadFile = useCallback((file: File) => {
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
    if (videoRef.current) videoRef.current.playbackRate = 1;
  }, []);

  const play = useCallback(() => { videoRef.current?.play(); }, []);
  const pause = useCallback(() => { videoRef.current?.pause(); }, []);
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
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
    setCurrentTime,
  };
}
