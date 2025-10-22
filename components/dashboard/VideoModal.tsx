"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IconX } from "@tabler/icons-react";
import type { VideoWithStats } from "@/lib/queries/videos";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: VideoFormData) => Promise<void>;
  video?: VideoWithStats | null;
  playerId: string;
  userId: string;
}

export interface VideoFormData {
  title: string;
  description: string;
  thumbnail_url: string;
  playback_url: string;
  duration_seconds: number;
  visibility: 'public' | 'unlisted' | 'private';
  tags: string[];
}

export function VideoModal({ isOpen, onClose, onSave, video, playerId, userId }: VideoModalProps) {
  const [formData, setFormData] = useState<VideoFormData>({
    title: '',
    description: '',
    thumbnail_url: '',
    playback_url: '',
    duration_seconds: 0,
    visibility: 'public',
    tags: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (video) {
      setFormData({
        title: video.title,
        description: video.description || '',
        thumbnail_url: video.thumbnail_url || '',
        playback_url: video.playback_url || '',
        duration_seconds: video.duration_seconds || 0,
        visibility: video.visibility,
        tags: video.tags || [],
      });
      setTagsInput((video.tags || []).join(', '));
    } else {
      setFormData({
        title: '',
        description: '',
        thumbnail_url: '',
        playback_url: '',
        duration_seconds: 0,
        visibility: 'public',
        tags: [],
      });
      setTagsInput('');
    }
  }, [video, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      await onSave({
        ...formData,
        tags,
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving video:', error);
      alert('Failed to save video');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-black dark:bg-black border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-white dark:text-white">{video ? 'Edit Video' : 'Upload New Video'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white dark:text-white mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-600 dark:border-neutral-600 rounded-sm bg-neutral-800 dark:bg-neutral-800 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder="Enter video title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white dark:text-white mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-600 dark:border-neutral-600 rounded-sm bg-neutral-800 dark:bg-neutral-800 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Enter video description"
            />
          </div>

          {/* Thumbnail URL */}
          <div>
            <label className="block text-sm font-medium text-white dark:text-white mb-1">
              Thumbnail URL
            </label>
            <input
              type="url"
              value={formData.thumbnail_url}
              onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-600 dark:border-neutral-600 rounded-sm bg-neutral-800 dark:bg-neutral-800 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/thumbnail.jpg"
            />
          </div>

          {/* Playback URL */}
          <div>
            <label className="block text-sm font-medium text-white dark:text-white mb-1">
              Video URL
            </label>
            <input
              type="url"
              value={formData.playback_url}
              onChange={(e) => setFormData({ ...formData, playback_url: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-600 dark:border-neutral-600 rounded-sm bg-neutral-800 dark:bg-neutral-800 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/video.mp4"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-white dark:text-white mb-1">
              Duration (seconds)
            </label>
            <input
              type="number"
              value={formData.duration_seconds}
              onChange={(e) => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-neutral-600 dark:border-neutral-600 rounded-sm bg-neutral-800 dark:bg-neutral-800 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              placeholder="180"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-white dark:text-white mb-1">
              Visibility
            </label>
            <select
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
              className="w-full px-3 py-2 border border-neutral-600 dark:border-neutral-600 rounded-sm bg-neutral-800 dark:bg-neutral-800 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-white dark:text-white mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-600 dark:border-neutral-600 rounded-sm bg-neutral-800 dark:bg-neutral-800 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="highlights, training, game"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSaving || !formData.title}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600 text-white rounded-sm font-medium transition-colors"
            >
              {isSaving ? 'Saving...' : video ? 'Save Changes' : 'Upload Video'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-neutral-600 dark:border-neutral-600 hover:bg-neutral-700 dark:hover:bg-neutral-700 text-white dark:text-white rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

