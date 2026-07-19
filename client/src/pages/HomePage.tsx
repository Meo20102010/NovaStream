'use client';

import { motion } from 'framer-motion';
import {
  HiVideoCamera,
  HiCloudUpload,
  HiGlobe,
  HiEye,
  HiChartBar,
  HiClock,
  HiAdjustments,
  HiChip,
  HiServer,
  HiGlobeAlt,
} from 'react-icons/hi';
import StatCard from '@/components/StatCard';
import VideoCard from '@/components/VideoCard';
import { SkeletonGrid, SkeletonStat } from '@/components/Skeleton';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatFileSize } from '@/lib/utils';

interface DashboardData {
  totalVideos: number;
  totalUsers: number;
  totalViews: number;
  totalStorage: number;
  totalUrls: number;
  cpu: number;
  ram: number;
  recentVideos: any[];
  popularVideos: any[];
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: res } = await api.get('/api/admin/dashboard');
        setData(res.data);
      } catch {
        try {
          const { data: res } = await api.get('/api/stats/overview');
          setData({
            totalVideos: res.data.totalVideos,
            totalUsers: 0,
            totalViews: res.data.totalViews,
            totalStorage: res.data.totalStorage,
            totalUrls: res.data.totalVideos,
            cpu: 0,
            ram: 0,
            recentVideos: [],
            popularVideos: [],
          });
        } catch {}
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.2) 50%, rgba(236,72,153,0.1) 100%)',
        }}
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="relative">
          <h1 className="text-3xl font-bold mb-2">
            Welcome to <span className="gradient-text">NovaStream</span>
          </h1>
          <p className="text-gray-400">Professional Media Server Dashboard</p>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonStat key={i} />
          ))}
        </div>
      ) : data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <StatCard title="Total Videos" value={data.totalVideos} icon={HiVideoCamera} trend={{ value: 12, isPositive: true }} />
            <StatCard title="Total Storage" value={formatFileSize(data.totalStorage)} icon={HiCloudUpload} />
            <StatCard title="Total Views" value={data.totalViews.toLocaleString()} icon={HiEye} trend={{ value: 8, isPositive: true }} />
            <StatCard title="Active Users" value={data.totalUsers} icon={HiGlobe} trend={{ value: 3, isPositive: true }} />
            <StatCard title="Total URLs" value={data.totalUrls} icon={HiGlobeAlt} />
            <StatCard title="CPU Usage" value={`${data.cpu}%`} icon={HiAdjustments} />
            <StatCard title="RAM Usage" value={`${data.ram}%`} icon={HiChip} />
            <StatCard title="Server Status" value="Online" icon={HiServer} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <HiClock className="w-5 h-5 text-primary-400" />
                Recent Uploads
              </h2>
              {data.recentVideos.length > 0 ? (
                <div className="space-y-3">
                  {data.recentVideos.map((video, i) => (
                    <VideoCard key={video.id} video={video} index={i} />
                  ))}
                </div>
              ) : (
                <div className="glass-card text-center py-12 text-gray-400">
                  No videos uploaded yet
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <HiChartBar className="w-5 h-5 text-primary-400" />
                Most Viewed
              </h2>
              {data.popularVideos.length > 0 ? (
                <div className="space-y-3">
                  {data.popularVideos.map((video, i) => (
                    <VideoCard key={video.id} video={video} index={i} />
                  ))}
                </div>
              ) : (
                <div className="glass-card text-center py-12 text-gray-400">
                  No views yet
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
