'use client';

import { motion } from 'framer-motion';
import { HiSearch, HiBell, HiMoon, HiSun } from 'react-icons/hi';
import { useState } from 'react';
import { useTheme } from 'next-themes';

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, setTheme } = useTheme();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-30 glass border-b border-white/5"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search videos, categories, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            {theme === 'dark' ? (
              <HiSun className="w-5 h-5 text-gray-400" />
            ) : (
              <HiMoon className="w-5 h-5 text-gray-400" />
            )}
          </button>

          <button className="relative p-2 rounded-xl hover:bg-white/5 transition-colors">
            <HiBell className="w-5 h-5 text-gray-400" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
