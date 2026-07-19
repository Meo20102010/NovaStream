'use client';

import { motion } from 'framer-motion';
import VideoCard from '@/components/VideoCard';
import { SkeletonGrid } from '@/components/Skeleton';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { HiSearch, HiFilter } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function VideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const { user } = useAuthStore();
  const canDelete = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '12' };
      if (search) params.search = search;
      if (category) params.category = category;
      const { data } = await api.get('/api/videos', { params });
      setVideos(data.data.videos);
      setTotalPages(data.data.pagination.pages);
    } catch {} finally {
      setIsLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  useEffect(() => {
    api.get('/api/categories').then(({ data }) => setCategories(data.data)).catch(() => {});
  }, []);

  const handleDelete = async (video: any) => {
    try {
      await api.delete(`/api/videos/${video.id}`);
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      toast.success('Video deleted');
    } catch {
      toast.error('Failed to delete video');
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">Videos</h1>
        <p className="text-gray-400">Browse your video library</p>
      </motion.div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search videos..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="glass-input pl-10"
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="glass-input w-auto min-w-[160px]"
        >
          <option value="">All Categories</option>
          {categories.map((c: any) => (
            <option key={c.category} value={c.category}>
              {c.category} ({c._count})
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <SkeletonGrid />
      ) : videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video, i) => (
            <VideoCard
              key={video.id}
              video={video}
              index={i}
              showDelete={canDelete}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card text-center py-20 text-gray-400">
          No videos found
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-10 h-10 rounded-xl font-medium transition-all ${
                p === page ? 'bg-primary-500 text-white' : 'glass hover:bg-white/5'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
