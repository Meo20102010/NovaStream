'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api, { API_URL } from '@/lib/api';
import { formatFileSize, formatDuration, timeAgo, getResolutionLabel, getFullVideoUrl } from '@/lib/utils';
import { HiClock, HiEye, HiChip, HiShare, HiCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function WatchPage() {
  const params = useParams();
  const id = params?.id as string;
  const [video, setVideo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/videos/${id}`)
      .then(({ data }) => { setVideo(data.data); setIsLoading(false); })
      .catch(() => { setError(true); setIsLoading(false); });
  }, [id]);

  const copyLink = () => {
    navigator.clipboard.writeText(getFullVideoUrl(video));
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 gradient-text">404</h1>
          <p className="text-gray-400 mb-6">Video not found</p>
          <a href="/" className="btn-primary">Go Home</a>
        </div>
      </div>
    );
  }

  const size = typeof video.size === 'string' ? parseInt(video.size) : video.size;
  const streamUrl = `${API_URL}/api/videos/${video.id}/stream`;

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-5xl mx-auto">
        <div className="bg-black rounded-none md:rounded-2xl overflow-hidden md:mt-6">
          <video
            src={streamUrl}
            poster={video.posterPath ? `${API_URL}/storage/${video.posterPath.split('storage/').pop()}` : undefined}
            controls
            autoPlay
            className="w-full aspect-video"
          />
        </div>

        <div className="p-4 md:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">{video.title}</h1>
            <button
              onClick={copyLink}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all"
            >
              {copied ? <HiCheck className="w-4 h-4 text-emerald-400" /> : <HiShare className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-400">
            <span className="flex items-center gap-1"><HiEye className="w-4 h-4" /> {video.views.toLocaleString()} views</span>
            <span className="flex items-center gap-1"><HiClock className="w-4 h-4" /> {timeAgo(video.createdAt)}</span>
            {video.duration && <span>{formatDuration(video.duration)}</span>}
            <span>{formatFileSize(size)}</span>
            {video.width && video.height && (
              <span className="flex items-center gap-1">
                <HiChip className="w-4 h-4" /> {getResolutionLabel(video.width, video.height)}
              </span>
            )}
          </div>

          {video.description && (
            <p className="text-sm text-gray-300 leading-relaxed border-t border-white/5 pt-4">
              {video.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
