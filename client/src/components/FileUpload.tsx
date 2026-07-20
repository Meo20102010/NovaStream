'use client';

import { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { upload } from '@vercel/blob/client';
import { HiCloudUpload, HiX, HiCheckCircle, HiExclamationCircle, HiLockClosed } from 'react-icons/hi';
import api from '@/lib/api';
import { formatFileSize } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

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
  const uploadsRef = useRef<UploadFile[]>([]);
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  const syncUploads = useCallback((updater: UploadFile[] | ((prev: UploadFile[]) => UploadFile[])) => {
    setUploads((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      uploadsRef.current = next;
      return next;
    });
  }, []);

  const startUpload = useCallback(async (index: number) => {
    const uploadFile = uploadsRef.current[index];
    if (!uploadFile || uploadFile.status === 'uploading' || uploadFile.status === 'completed') return;

    syncUploads((prev) =>
      prev.map((u, i) => (i === index ? { ...u, status: 'uploading' } : u))
    );

    try {
      // 1. Initialize upload session on our server
      const { data: initData } = await api.post('/api/uploads/init', {
        filename: uploadFile.file.name,
        mimeType: uploadFile.file.type || 'application/octet-stream',
        totalSize: uploadFile.file.size,
        totalChunks: Math.ceil(uploadFile.file.size / (5 * 1024 * 1024)) || 1,
      });

      const uploadId = initData.data.uploadId;
      syncUploads((prev) =>
        prev.map((u, i) => (i === index ? { ...u, uploadId } : u))
      );

      // 2. Upload directly to Vercel Blob
      const blob: Awaited<ReturnType<typeof upload>> = await upload(uploadFile.file.name, uploadFile.file, {
        access: 'public',
        handleUploadUrl: '/api/uploads/token',
        clientPayload: JSON.stringify({ uploadId }),
        onUploadProgress: ({ percentage }) => {
          syncUploads((prev) =>
            prev.map((u, i) =>
              i === index ? { ...u, progress: Math.round(percentage) } : u
            )
          );
        },
      });

      // 3. Tell our server the upload is complete and create the Video record
      const { data: completeData } = await api.post(`/api/uploads/${uploadId}/complete`, {
        blobUrl: blob.url,
      });

      syncUploads((prev) =>
        prev.map((u, i) =>
          i === index ? { ...u, status: 'completed', progress: 100, videoId: completeData.data.videoId } : u
        )
      );
      toast.success(`Uploaded: ${uploadFile.file.name}`);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || err?.message || 'Upload failed';
      console.error('Upload error:', err);
      syncUploads((prev) =>
        prev.map((u, i) =>
          i === index ? { ...u, status: 'error', error: message } : u
        )
      );
      toast.error(message);
    }
  }, [syncUploads]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));
    syncUploads((prev) => {
      const startIndex = prev.length;
      const combined = [...prev, ...newUploads];
      // Auto-start uploads for the newly added files after the next render tick
      setTimeout(() => {
        newUploads.forEach((_, offset) => {
          startUpload(startIndex + offset);
        });
      }, 50);
      return combined;
    });
  }, [syncUploads, startUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv'] },
    maxSize: 10 * 1024 * 1024 * 1024, // 10GB
    multiple: true,
  });

  const startAllUploads = () => {
    uploadsRef.current.forEach((u, index) => {
      if (u.status === 'pending') {
        startUpload(index);
      }
    });
  };

  const removeUpload = (index: number) => {
    syncUploads((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-400">Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isAuthenticated ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <HiLockClosed className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">Log in to upload videos</p>
          <p className="text-sm text-gray-400 mb-6">You need to be signed in to upload content.</p>
          <button onClick={() => router.push('/login')} className="btn-primary">
            Go to Login
          </button>
        </div>
      ) : (
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
          <p className="text-xs text-gray-500 mt-2">MP4, WebM, MKV, AVI, MOV, FLV up to 10GB</p>
        </div>
      )}

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
