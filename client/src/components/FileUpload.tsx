'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { HiCloudUpload, HiX, HiCheckCircle, HiExclamationCircle } from 'react-icons/hi';
import api from '@/lib/api';
import { formatFileSize } from '@/lib/utils';

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  uploadId?: string;
  videoId?: string;
  error?: string;
}

export default function FileUpload() {
  const [uploads, setUploads] = useState<UploadFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));
    setUploads((prev) => [...prev, ...newUploads]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv'] },
    maxSize: 10 * 1024 * 1024 * 1024,
    multiple: true,
  });

  const startUpload = async (index: number) => {
    const upload = uploads[index];
    if (!upload || upload.status === 'uploading' || upload.status === 'completed') return;

    setUploads((prev) =>
      prev.map((u, i) => (i === index ? { ...u, status: 'uploading' } : u))
    );

    try {
      const CHUNK_SIZE = 5 * 1024 * 1024;
      const totalChunks = Math.ceil(upload.file.size / CHUNK_SIZE);

      const { data } = await api.post('/api/uploads/init', {
        filename: upload.file.name,
        mimeType: upload.file.type,
        totalSize: upload.file.size,
        totalChunks,
      });

      const uploadId = data.data.uploadId;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, upload.file.size);
        const chunk = upload.file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk, `chunk_${i}`);

        await api.post(`/api/uploads/${uploadId}/chunk/${i}`, formData, {
          onUploadProgress: (e) => {
            const chunkProgress = e.loaded / (e.total || 1);
            const overallProgress = ((i + chunkProgress) / totalChunks) * 100;
            setUploads((prev) =>
              prev.map((u, idx) => (idx === index ? { ...u, progress: overallProgress } : u))
            );
          },
        });
      }

      const { data: completeData } = await api.post(`/api/uploads/${uploadId}/complete`);

      setUploads((prev) =>
        prev.map((u, i) =>
          i === index ? { ...u, status: 'completed', progress: 100, videoId: completeData.data.videoId } : u
        )
      );
    } catch (err: any) {
      setUploads((prev) =>
        prev.map((u, i) =>
          i === index ? { ...u, status: 'error', error: err.message } : u
        )
      );
    }
  };

  const startAllUploads = () => {
    uploads.forEach((_, index) => {
      if (uploads[index].status === 'pending') {
        startUpload(index);
      }
    });
  };

  const removeUpload = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
          isDragActive
            ? 'border-primary-500 bg-primary-500/10 scale-[1.02]'
            : 'border-white/10 hover:border-primary-500/50 hover:bg-white/5'
        }`}
      >
        <input {...getInputProps()} />
        <HiCloudUpload className={`w-16 h-16 mx-auto mb-4 ${isDragActive ? 'text-primary-400' : 'text-gray-400'}`} />
        <p className="text-lg font-medium mb-2">
          {isDragActive ? 'Drop files here' : 'Drag & drop videos here'}
        </p>
        <p className="text-sm text-gray-400">or click to browse</p>
        <p className="text-xs text-gray-500 mt-2">MP4, WebM, MKV, AVI up to 10GB</p>
      </div>

      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{uploads.length} file(s)</h3>
              {uploads.some((u) => u.status === 'pending') && (
                <button onClick={startAllUploads} className="btn-primary text-sm py-2 px-4">
                  Upload All
                </button>
              )}
            </div>

            {uploads.map((upload, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-card p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{upload.file.name}</p>
                      <div className="flex items-center gap-2">
                        {upload.status === 'completed' && (
                          <HiCheckCircle className="w-5 h-5 text-emerald-400" />
                        )}
                        {upload.status === 'error' && (
                          <HiExclamationCircle className="w-5 h-5 text-red-400" />
                        )}
                        <button
                          onClick={() => removeUpload(index)}
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          <HiX className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mb-2">{formatFileSize(upload.file.size)}</p>

                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${upload.progress}%` }}
                        className={`h-full rounded-full transition-all ${
                          upload.status === 'completed'
                            ? 'bg-emerald-500'
                            : upload.status === 'error'
                            ? 'bg-red-500'
                            : 'bg-gradient-to-r from-primary-500 to-purple-500'
                        }`}
                      />
                    </div>

                    <p className="text-xs text-gray-400 mt-1">
                      {upload.status === 'completed'
                        ? 'Completed'
                        : upload.status === 'error'
                        ? upload.error || 'Failed'
                        : `${Math.round(upload.progress)}%`}
                    </p>
                  </div>

                  {upload.status === 'pending' && (
                    <button
                      onClick={() => startUpload(index)}
                      className="btn-primary text-sm py-2 px-4"
                    >
                      Upload
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
