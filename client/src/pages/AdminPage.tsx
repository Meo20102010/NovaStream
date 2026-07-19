'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import StatCard from '@/components/StatCard';
import { SkeletonStat } from '@/components/Skeleton';
import {
  HiVideoCamera,
  HiUsers,
  HiEye,
  HiCloudUpload,
  HiKey,
  HiClipboardList,
  HiAdjustments,
  HiChip,
  HiLink,
  HiRefresh,
} from 'react-icons/hi';
import { formatFileSize, getVideoUrl, getFullVideoUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, usersRes, logsRes, keysRes, videosRes] = await Promise.all([
          api.get('/api/admin/dashboard'),
          api.get('/api/admin/users'),
          api.get('/api/admin/logs'),
          api.get('/api/admin/api-keys'),
          api.get('/api/videos?limit=100'),
        ]);
        setDashboard(dashRes.data.data);
        setUsers(usersRes.data.data.users);
        setLogs(logsRes.data.data.logs);
        setApiKeys(keysRes.data.data);
        setVideos(videosRes.data.data.videos);
      } catch {} finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const toggleUserStatus = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/api/admin/users/${id}`, { isActive: !isActive });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: !isActive } : u)));
      toast.success('User updated');
    } catch { toast.error('Failed to update user'); }
  };

  const createApiKey = async () => {
    const name = prompt('API Key name:');
    if (!name) return;
    try {
      const { data } = await api.post('/api/admin/api-keys', { name });
      setApiKeys((prev) => [data.data, ...prev]);
      toast.success('API key created');
    } catch { toast.error('Failed to create API key'); }
  };

  const deleteApiKey = async (id: string) => {
    try {
      await api.delete(`/api/admin/api-keys/${id}`);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success('API key deleted');
    } catch { toast.error('Failed to delete API key'); }
  };

  const regenerateUrl = async (videoId: string) => {
    try {
      const { data } = await api.post(`/api/videos/${videoId}/regenerate-url`);
      setVideos((prev) => prev.map((v) => v.id === videoId ? { ...v, slug: data.data.slug } : v));
      toast.success('URL regenerated');
    } catch { toast.error('Failed to regenerate URL'); }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'videos', label: 'Videos' },
    { id: 'users', label: 'Users' },
    { id: 'logs', label: 'Activity Logs' },
    { id: 'api-keys', label: 'API Keys' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-gray-400">Manage your NovaStream server</p>
      </motion.div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id ? 'bg-primary-500 text-white' : 'glass hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
        </div>
      ) : (
        <>
          {activeTab === 'overview' && dashboard && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Videos" value={dashboard.totalVideos} icon={HiVideoCamera} />
                <StatCard title="Total Users" value={dashboard.totalUsers} icon={HiUsers} />
                <StatCard title="Total Views" value={(dashboard.totalViews || 0).toLocaleString()} icon={HiEye} />
                <StatCard title="Storage Used" value={formatFileSize(dashboard.totalStorage || 0)} icon={HiCloudUpload} />
                <StatCard title="CPU Usage" value={`${dashboard.cpu || 0}%`} icon={HiAdjustments} />
                <StatCard title="RAM Usage" value={`${dashboard.ram || 0}%`} icon={HiChip} />
                <StatCard title="API Keys" value={apiKeys.length} icon={HiKey} />
                <StatCard title="Activity Logs" value={logs.length} icon={HiClipboardList} />
              </div>
            </div>
          )}

          {activeTab === 'videos' && (
            <div className="glass-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 text-gray-400 font-medium">Title</th>
                    <th className="text-left p-3 text-gray-400 font-medium">URL</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Views</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Size</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video) => (
                    <tr key={video.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 font-medium max-w-[200px] truncate">{video.title}</td>
                      <td className="p-3">
                        <code className="text-xs text-primary-400 bg-primary-500/10 px-2 py-1 rounded">
                          /vx/{video.slug}
                        </code>
                      </td>
                      <td className="p-3 text-gray-400">{(video.views || 0).toLocaleString()}</td>
                      <td className="p-3 text-gray-400">{formatFileSize(typeof video.size === 'string' ? parseInt(video.size) : video.size)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(getFullVideoUrl(video));
                              toast.success('Link copied!');
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <HiLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => regenerateUrl(video.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-primary-500/20 transition-colors"
                          >
                            <HiRefresh className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="glass-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 text-gray-400 font-medium">User</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Role</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Joined</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-primary-500/20 text-primary-300">
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => toggleUserStatus(user.id, user.isActive)}
                          className="text-sm text-primary-400 hover:text-primary-300"
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="glass-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 text-gray-400 font-medium">Action</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Resource</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Details</th>
                    <th className="text-left p-3 text-gray-400 font-medium">User</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-primary-500/20 text-primary-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-gray-300">{log.resource || '-'}</td>
                      <td className="p-3 text-gray-400 max-w-[200px] truncate">{log.details || '-'}</td>
                      <td className="p-3 text-gray-400">{log.user?.username || 'System'}</td>
                      <td className="p-3 text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div className="space-y-4">
              <button onClick={createApiKey} className="btn-primary text-sm">
                Create API Key
              </button>
              <div className="glass-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 text-gray-400 font-medium">Name</th>
                      <th className="text-left p-3 text-gray-400 font-medium">Key</th>
                      <th className="text-left p-3 text-gray-400 font-medium">Status</th>
                      <th className="text-left p-3 text-gray-400 font-medium">Created</th>
                      <th className="text-right p-3 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map((k) => (
                      <tr key={k.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-3 font-medium">{k.name}</td>
                        <td className="p-3 font-mono text-xs text-gray-400">{k.key.substring(0, 16)}...</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            k.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {k.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400">{new Date(k.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => deleteApiKey(k.id)} className="text-sm text-red-400 hover:text-red-300">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
