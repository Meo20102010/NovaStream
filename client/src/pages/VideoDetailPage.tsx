'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import VideoPlayer from '@/components/VideoPlayer';
import { SkeletonCard } from '@/components/Skeleton';
import api from '@/lib/api';
import { formatFileSize, formatDuration, timeAgo, getResolutionLabel } from '@/lib/utils';
import { HiEye, HiClock, HiTag, HiFolder, HiChip, HiShare, HiCheck } from 'react-icons/hi';
import { getFullVideoUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function VideoDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [video, setVideo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/videos/${id}`)
      .then(({ data }) => { setVideo(data.data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <SkeletonCard className="w-full h-96" />;
  if (!video) return <div className="text-center py-20 text-gray-400">Video not found</div>;

  const size = typeof video.size === 'string' ? parseInt(video.size) : video.size;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <VideoPlayer
        videoId={video.id}
        src={`/api/videos/${video.id}/stream`}
        poster={video.posterPath || undefined}
        title={video.title}
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{video.title}</h1>
            <p className="text-gray-400 mt-1">{video.description || 'No description'}</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(getFullVideoUrl(video));
              setCopied(true);
              toast.success('Link copied!');
              setTimeout(() => setCopied(false), 2000);
            }}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {copied ? <HiCheck className="w-4 h-4 text-emerald-400" /> : <HiShare className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1"><HiEye className="w-4 h-4" /> {video.views.toLocaleString()} views</span>
          <span className="flex items-center gap-1"><HiClock className="w-4 h-4" /> {timeAgo(video.createdAt)}</span>
          <span>{formatFileSize(size)}</span>
          {video.duration && <span>{formatDuration(video.duration)}</span>}
          {video.width && video.height && <span className="flex items-center gap-1"><HiChip className="w-4 h-4" /> {getResolutionLabel(video.width, video.height)}</span>}
          {video.codec && <span>{video.codec.toUpperCase()}</span>}
          {video.fps && <span>{Math.round(video.fps)} FPS</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          {video.category && (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary-500/20 text-primary-300">
              <HiFolder className="w-3.5 h-3.5" /> {video.category}
            </span>
          )}
          {(() => {
            const tags = typeof video.tags === 'string' ? JSON.parse(video.tags || '[]') : (video.tags || []);
            return tags.map((tag: string) => (
              <span key={tag} className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-white/5 text-gray-300">
                <HiTag className="w-3.5 h-3.5" /> {tag}
              </span>
            ));
          })()}
        </div>
      </motion.div>
    </div>
  );
}
