'use client';

import { motion } from 'framer-motion';
import FileUpload from '@/components/FileUpload';

export default function UploadPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">Upload Videos</h1>
        <p className="text-gray-400">Drag and drop or click to upload video files</p>
      </motion.div>

      <FileUpload />
    </div>
  );
}
