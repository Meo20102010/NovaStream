'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import {
  HiHome,
  HiVideoCamera,
  HiCloudUpload,
  HiCog,
  HiChartBar,
  HiMenu,
  HiX,
} from 'react-icons/hi';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Home', icon: HiHome },
  { href: '/videos', label: 'Videos', icon: HiVideoCamera },
  { href: '/upload', label: 'Upload', icon: HiCloudUpload },
  { href: '/dashboard', label: 'Dashboard', icon: HiChartBar },
  { href: '/admin', label: 'Admin', icon: HiCog },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();

  const initials = user?.username
    ? user.username.substring(0, 2).toUpperCase()
    : '??';

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass rounded-xl"
      >
        {isOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={cn(
          'fixed left-0 top-0 h-full w-72 glass z-50 transition-transform duration-300',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <HiVideoCamera className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">NovaStream</span>
          </Link>
        </div>

        <nav className="px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300',
                  isActive
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-4 right-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium">{user?.username || 'Guest'}</p>
                <p className="text-xs text-gray-400">{user?.email || ''}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
