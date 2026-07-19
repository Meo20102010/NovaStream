import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { config } from '../config/env';
import prisma from '../lib/prisma';

const execFileAsync = promisify(execFile);

export function generateVideoSlug(): string {
  return 'v' + nanoid(10);
}

export function generateUniqueUrl(): string {
  return nanoid(12);
}

export async function getVideoMetadata(filePath: string) {
  try {
    const { stdout } = await execFileAsync(config.FFMPEG_PATH, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);

    const metadata = JSON.parse(stdout);
    const videoStream = metadata.streams?.find((s: any) => s.codec_type === 'video');
    const format = metadata.format;

    return {
      duration: parseFloat(format?.duration || '0'),
      width: videoStream?.width || null,
      height: videoStream?.height || null,
      codec: videoStream?.codec_name || null,
      fps: videoStream?.r_frame_rate ? eval(videoStream.r_frame_rate) : null,
      bitrate: parseInt(format?.bit_rate || '0'),
    };
  } catch (error) {
    console.error('Failed to extract video metadata:', error);
    return null;
  }
}

export async function generateThumbnails(videoPath: string, videoId: string): Promise<string[]> {
  const thumbnailsDir = config.THUMBNAIL_DIR;
  const thumbnails: string[] = [];

  try {
    const metadata = await getVideoMetadata(videoPath);
    const duration = metadata?.duration || 0;

    if (duration <= 0) return thumbnails;

    const count = config.THUMBNAIL_COUNT;
    const interval = duration / (count + 1);

    for (let i = 1; i <= count; i++) {
      const timestamp = interval * i;
      const thumbName = `${videoId}_thumb_${i}.jpg`;
      const thumbPath = path.join(thumbnailsDir, thumbName);

      await execFileAsync(config.FFMPEG_PATH, [
        '-v', 'quiet',
        '-ss', timestamp.toString(),
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2',
        '-vf', 'scale=320:-1',
        thumbPath,
      ]);

      thumbnails.push(thumbPath);
    }
  } catch (error) {
    console.error('Failed to generate thumbnails:', error);
  }

  return thumbnails;
}

export async function generatePoster(videoPath: string, videoId: string): Promise<string | null> {
  const posterDir = config.POSTER_DIR;

  try {
    const metadata = await getVideoMetadata(videoPath);
    const duration = metadata?.duration || 0;
    const timestamp = duration > 10 ? duration / 3 : 1;

    const posterName = `${videoId}_poster.jpg`;
    const posterPath = path.join(posterDir, posterName);

    await execFileAsync(config.FFMPEG_PATH, [
      '-v', 'quiet',
      '-ss', timestamp.toString(),
      '-i', videoPath,
      '-vframes', '1',
      '-q:v', '1',
      '-vf', 'scale=1280:-1',
      posterPath,
    ]);

    return posterPath;
  } catch (error) {
    console.error('Failed to generate poster:', error);
    return null;
  }
}

export function getResolutionLabel(width: number | null, height: number | null): string {
  if (!height) return 'Unknown';
  if (height >= 2160) return '4K';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  if (height >= 360) return '360p';
  return `${height}p`;
}

export async function logActivity(userId: string | null, action: string, resource?: string, details?: string, ip?: string) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, resource, details, ip },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
