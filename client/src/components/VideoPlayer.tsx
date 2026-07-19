'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlay,
  HiPause,
  HiVolumeUp,
  HiVolumeOff,
  HiCog,
  HiArrowsExpand,
  HiArrowLeft,
  HiArrowRight,
} from 'react-icons/hi';
import { formatDuration } from '@/lib/utils';

interface VideoPlayerProps {
  videoId: string;
  src: string;
  poster?: string;
  title: string;
}

export default function VideoPlayer({ videoId, src, poster, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewX, setPreviewX] = useState(0);

  const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('progress', onProgress);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('progress', onProgress);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(10);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(-10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(-0.1);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const seek = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
  };

  const changeVolume = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Math.max(0, Math.min(1, video.volume + delta));
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      await container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    setPreviewTime(percentage * duration);
    setPreviewX(x);
    setShowPreview(true);
  };

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-2xl overflow-hidden group"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full aspect-video cursor-pointer"
        onClick={togglePlay}
        playsInline
      />

      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <button
              onClick={togglePlay}
              className="w-20 h-20 rounded-full bg-primary-500/90 flex items-center justify-center backdrop-blur-sm hover:bg-primary-500 transition-all hover:scale-110"
            >
              <HiPlay className="w-10 h-10 text-white ml-1" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-12"
          >
            <div
              ref={progressRef}
              className="relative h-1.5 bg-white/20 rounded-full mb-4 cursor-pointer group/progress"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = (e.clientX - rect.left) / rect.width;
                seekTo(percentage * duration);
              }}
              onMouseMove={handleProgressHover}
              onMouseLeave={() => setShowPreview(false)}
            >
              <div
                className="absolute h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              <div
                className="absolute h-full bg-white/20 rounded-full"
                style={{ width: `${(buffered / duration) * 100}%` }}
              />
              <div
                className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-lg -translate-y-1/2 top-1/2 opacity-0 group-hover/progress:opacity-100 transition-opacity"
                style={{ left: `calc(${(currentTime / duration) * 100}% - 7px)` }}
              />

              {showPreview && (
                <div
                  className="absolute bottom-6 px-2 py-1 bg-dark-900 rounded text-xs font-mono -translate-x-1/2 pointer-events-none"
                  style={{ left: previewX }}
                >
                  {formatDuration(previewTime)}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  {isPlaying ? <HiPause className="w-5 h-5" /> : <HiPlay className="w-5 h-5" />}
                </button>

                <button onClick={() => seek(-10)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <HiArrowLeft className="w-5 h-5" />
                </button>

                <button onClick={() => seek(10)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <HiArrowRight className="w-5 h-5" />
                </button>

                <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  {isMuted ? <HiVolumeOff className="w-5 h-5" /> : <HiVolumeUp className="w-5 h-5" />}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const video = videoRef.current;
                    if (video) video.volume = parseFloat(e.target.value);
                  }}
                  className="w-20 accent-primary-500"
                />

                <span className="text-sm font-mono">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <HiCog className="w-5 h-5" />
                  </button>

                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-2 glass rounded-xl p-3 min-w-[140px]">
                      <p className="text-xs text-gray-400 mb-2">Playback Speed</p>
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => changePlaybackRate(rate)}
                          className={`block w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                            playbackRate === rate ? 'text-primary-400 bg-primary-500/20' : 'hover:bg-white/5'
                          }`}
                        >
                          {rate === 1 ? 'Normal' : `${rate}x`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <HiArrowsExpand className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
