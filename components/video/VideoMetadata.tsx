"use client";

import { useState } from "react";
import { Eye, ThumbsUp, ThumbsDown, Share2, Bell } from "lucide-react";
import Image from "next/image";

interface VideoMetadataProps {
  title: string;
  duration: string;
  publishedDate: string;
  views: string;
  likes: string;
  dislikes: string;
  description: string;
  isFollowing?: boolean;
  onFollow?: () => void;
}

export default function VideoMetadata({
  title,
  duration,
  publishedDate,
  views,
  likes,
  dislikes,
  description,
  isFollowing = false,
  onFollow
}: VideoMetadataProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(parseInt(likes.replace(/,/g, '')));
  const [dislikeCount, setDislikeCount] = useState(parseInt(dislikes.replace(/,/g, '')));

  const handleLike = () => {
    if (isDisliked) {
      setDislikeCount(prev => prev - 1);
      setIsDisliked(false);
    }
    if (isLiked) {
      setLikeCount(prev => prev - 1);
      setIsLiked(false);
    } else {
      setLikeCount(prev => prev + 1);
      setIsLiked(true);
    }
  };

  const handleDislike = () => {
    if (isLiked) {
      setLikeCount(prev => prev - 1);
      setIsLiked(false);
    }
    if (isDisliked) {
      setDislikeCount(prev => prev - 1);
      setIsDisliked(false);
    } else {
      setDislikeCount(prev => prev + 1);
      setIsDisliked(true);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>{duration}</span>
            <span>Published on {publishedDate}</span>
          </div>
        </div>
        <button 
          onClick={onFollow}
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-md transition-colors"
        >
          {isFollowing ? "FOLLOWING" : "FOLLOW"}
        </button>
      </div>

      {/* Engagement Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-gray-400" />
          <span className="text-gray-400">{views} viewers</span>
        </div>
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 transition-colors ${
            isLiked ? "text-blue-400" : "text-gray-400 hover:text-white"
          }`}
        >
          <ThumbsUp size={16} />
          <span>{formatNumber(likeCount)} Liked</span>
        </button>
        <button
          onClick={handleDislike}
          className={`flex items-center gap-2 transition-colors ${
            isDisliked ? "text-red-400" : "text-gray-400 hover:text-white"
          }`}
        >
          <ThumbsDown size={16} />
          <span>{formatNumber(dislikeCount)} Dislike</span>
        </button>
        <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <Share2 size={16} />
          <span>Share</span>
        </button>
        <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <Bell size={16} />
          <span>Notify</span>
        </button>
      </div>

      {/* Description */}
      <div className="bg-gray-900/50 rounded-lg p-4">
        <p className="text-gray-300 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
