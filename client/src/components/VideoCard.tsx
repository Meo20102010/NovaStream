'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { HiClock, HiEye, HiPlay, HiShare, HiCheck } from 'react-icons/hi';
import { formatFileSize, formatDuration, timeAgo, getVideoUrl, getResolutionLabel, getFullVideoUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    filename: string;
    size: string;
    duration?: number;
    width?: number;
    height?: number;
    slug: string;
    customUrl?: string;
    views: number;
    thumbnailPath?: string;
    posterPath?: string;
    category?: string;
    tags: string[];
    createdAt: string;
  };
  index?: number;
}

export default function VideoCard({ video, index = 0 }: VideoCardProps) {
  const [copied, setCopied] = useState(false);
  const videoUrl = getVideoUrl(video);
  const size = typeof video.size === 'string' ? parseInt(video.size) : video.size ?? 0;
  const views = typeof video.views === 'number' ? video.views : 0;

  const copyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(getFullVideoUrl(video));
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="glass-card group cursor-pointer"
    >
      <Link href={videoUrl}>
        <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-dark-900">
          {video.posterPath ? (
            <img
              src={video.posterPath}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-900/50 to-purple-900/50 flex items-center justify-center">
              <HiPlay className="w-12 h-12 text-white/30" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-14 h-14 rounded-full bg-primary-500/90 flex items-center justify-center backdrop-blur-sm">
              <HiPlay className="w-7 h-7 text-white ml-1" />
            </div>
          </div>

          <button
            onClick={copyLink}
            className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 hover:bg-primary-500/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all"
          >
            {copied ? <HiCheck className="w-4 h-4 text-emerald-400" /> : <HiShare className="w-4 h-4" />}
          </button>

          {video.duration && (
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-xs font-mono">
              {formatDuration(video.duration)}
            </div>
          )}

          {video.width && video.height && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-primary-500/80 text-xs font-medium">
              {getResolutionLabel(video.width, video.height)}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-white line-clamp-2 group-hover:text-primary-400 transition-colors">
            {video.title}
          </h3>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <HiEye className="w-3.5 h-3.5" />
              {views.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <HiClock className="w-3.5 h-3.5" />
              {timeAgo(video.createdAt)}
            </span>
            <span>{formatFileSize(size)}</span>
          </div>

          {video.category && (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-primary-500/20 text-primary-300">
              {video.category}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
