'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Play, Pause, Volume2, Download, FileAudio } from 'lucide-react';

interface AudioPlayerProps {
  url: string;
  candidateName?: string;
  transcript?: string;
  className?: string;
}

export function AudioPlayer({ url, candidateName, transcript, className }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setLoading(false);
      setError(null);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError('Failed to load audio');
      setLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [url]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      setError('Failed to play audio');
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const downloadAudio = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${candidateName || 'candidate'}_call_audio.mp3`;
    link.click();
  };

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg ${className}`}>
        <FileAudio className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-gray-600 text-sm text-center">
          Unable to load audio. <br />
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Click here to download
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg bg-white p-4 ${className}`}>
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">Call Recording</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadAudio}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Audio Controls */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlayPause}
            disabled={loading}
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-gray-500 min-w-10">
              {formatTime(currentTime)}
            </span>

            {/* Progress Bar */}
            <div
              className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-150"
                style={{
                  width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
                }}
              />
            </div>

            <span className="text-xs text-gray-500 min-w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Transcript</h5>
          <p className="text-sm text-gray-700 leading-relaxed max-h-32 overflow-y-auto">
            {transcript}
          </p>
        </div>
      )}
    </div>
  );
}