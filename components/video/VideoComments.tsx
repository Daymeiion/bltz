"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, MoreHorizontal } from "lucide-react";
import Image from "next/image";

interface Comment {
  id: string;
  author: string;
  authorAvatar?: string;
  content: string;
  likes: number;
  replies: number;
  isPinned?: boolean;
  timestamp: string;
}

const mockComments: Comment[] = [
  {
    id: "1",
    author: "@TheDiaryOfACEO",
    authorAvatar: "/images/Headshot.png",
    content: "Morgan is my favourite author of all time! Let me know if you like these types of convocations by liking the vid - that's the best way to let us know what topics and guests to bring you ❤️ (also, would be doing me a big favour if you could subscribe & join our community 🙏) i appreciate you - SB! X",
    likes: 332,
    replies: 36,
    isPinned: true,
    timestamp: "2 days ago"
  },
  {
    id: "2",
    author: "GamingFan123",
    content: "This was absolutely incredible! The production quality is amazing and the content is so engaging. Can't wait for the next episode!",
    likes: 45,
    replies: 3,
    timestamp: "1 day ago"
  },
  {
    id: "3",
    author: "SportsLover",
    content: "Great analysis and breakdown of the plays. Really helps understand the strategy behind the game.",
    likes: 23,
    replies: 1,
    timestamp: "3 hours ago"
  }
];

export default function VideoComments() {
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [newComment, setNewComment] = useState("");
  const [sortBy, setSortBy] = useState("Top");

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: "You",
      content: newComment,
      likes: 0,
      replies: 0,
      timestamp: "now",
    };

    setComments(prev => [comment, ...prev]);
    setNewComment("");
  };

  const handleLikeComment = (commentId: string) => {
    setComments(prev =>
      prev.map(comment =>
        comment.id === commentId
          ? { ...comment, likes: comment.likes + 1 }
          : comment
      )
    );
  };

  const totalComments = comments.reduce((total, comment) => total + 1 + comment.replies, 0);

  return (
    <div className="w-full">
      {/* Comments Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">
          {totalComments.toLocaleString()} Comments
        </h2>
        <div className="flex items-center gap-2">
          <MoreHorizontal size={16} className="text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent text-gray-400 border-none outline-none text-sm"
          >
            <option value="Top">Sort by</option>
            <option value="Newest">Newest</option>
            <option value="Oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* Add Comment */}
      <form onSubmit={handleSubmitComment} className="mb-8">
        <div className="flex gap-3">
          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-medium">U</span>
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full bg-transparent border-b border-gray-600 pb-2 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
            />
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            {/* Author Avatar */}
            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
              {comment.authorAvatar ? (
                <Image
                  src={comment.authorAvatar}
                  alt={comment.author}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-white text-sm font-medium">
                  {comment.author[1]?.toUpperCase()}
                </span>
              )}
            </div>

            {/* Comment Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-medium text-sm">{comment.author}</span>
                <span className="text-gray-400 text-sm">{comment.timestamp}</span>
                {comment.isPinned && (
                  <span className="text-blue-400 text-xs bg-blue-400/20 px-2 py-0.5 rounded">
                    Pinned
                  </span>
                )}
              </div>
              <p className="text-white text-sm leading-relaxed mb-3">
                {comment.content}
              </p>
              
              {/* Comment Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleLikeComment(comment.id)}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                >
                  <ThumbsUp size={16} />
                  <span className="text-sm">{comment.likes}</span>
                </button>
                <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                  <ThumbsDown size={16} />
                </button>
                <button className="text-gray-400 hover:text-white transition-colors text-sm">
                  Reply
                </button>
                {comment.replies > 0 && (
                  <button className="text-blue-400 hover:text-blue-300 transition-colors text-sm">
                    {comment.replies} replies
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
