import { create } from 'zustand';
import api from '../lib/api';

interface Video {
  id: string;
  title: string;
  description?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: string;
  duration?: number;
  width?: number;
  height?: number;
  codec?: string;
  fps?: number;
  slug: string;
  customUrl?: string;
  status: string;
  isPublic: boolean;
  views: number;
  category?: string;
  tags: string[];
  thumbnailPath?: string;
  posterPath?: string;
  createdAt: string;
  updatedAt: string;
}

interface VideoState {
  videos: Video[];
  currentVideo: Video | null;
  isLoading: boolean;
  pagination: { page: number; limit: number; total: number; pages: number };
  fetchVideos: (params?: Record<string, string>) => Promise<void>;
  fetchVideo: (id: string) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  updateVideo: (id: string, data: Partial<Video>) => Promise<void>;
}

export const useVideoStore = create<VideoState>((set) => ({
  videos: [],
  currentVideo: null,
  isLoading: false,
  pagination: { page: 1, limit: 20, total: 0, pages: 0 },

  fetchVideos: async (params) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/videos', { params });
      set({ videos: data.data.videos, pagination: data.data.pagination, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchVideo: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/api/videos/${id}`);
      set({ currentVideo: data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  deleteVideo: async (id) => {
    await api.delete(`/api/videos/${id}`);
    set((state) => ({ videos: state.videos.filter((v) => v.id !== id) }));
  },

  updateVideo: async (id, videoData) => {
    const { data } = await api.patch(`/api/videos/${id}`, videoData);
    set((state) => ({
      videos: state.videos.map((v) => (v.id === id ? { ...v, ...data.data } : v)),
      currentVideo: state.currentVideo?.id === id ? { ...state.currentVideo, ...data.data } : state.currentVideo,
    }));
  },
}));
