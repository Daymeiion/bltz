"use client";

import { useState } from "react";
import VideoPlayer from "./VideoPlayer";
import VideoComments from "./VideoComments";
import { Eye, ThumbsUp, ThumbsDown, ChevronDown } from "lucide-react";

interface MobileVideoLayoutProps {
  videoData: any;
}

export default function MobileVideoLayout({ videoData }: MobileVideoLayoutProps) {
  const [activeTab, setActiveTab] = useState<'video' | 'comments'>('video');

  return (
    <div className="min-h-screen bg-black text-white md:hidden">
      <div className="flex flex-col">
        {/* Video Player */}
        <div className="relative">
          <VideoPlayer 
            src={videoData.playback_url}
            title={videoData.title}
            poster={videoData.thumbnail}
          />
        </div>

        {/* Video Info */}
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h1 className="text-lg font-bold text-white">
              {videoData.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>{videoData.duration || "167min"}</span>
              <span>Published on {videoData.published_date || "June 4, 2020"}</span>
            </div>
          </div>

          {/* Engagement Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Eye size={14} className="text-gray-400" />
                <span className="text-gray-400">{videoData.views || "567k"}</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsUp size={14} className="text-gray-400" />
                <span className="text-gray-400">{videoData.likes || "45,648"}</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown size={14} className="text-gray-400" />
                <span className="text-gray-400">{videoData.dislikes || "326"}</span>
              </div>
            </div>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-md text-sm transition-colors">
              FOLLOWING
            </button>
          </div>

          {/* Description */}
          <div className="bg-gray-900/50 rounded-lg p-3">
            <p className="text-gray-300 text-sm leading-relaxed">
              {videoData.description}
            </p>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="border-t border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('video')}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                activeTab === 'video'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Related Videos
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                activeTab === 'comments'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Comments
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === 'video' && (
            <div className="p-4">
              {/* Mobile Video List */}
              <div className="space-y-4">
                <div className="border-b border-gray-700 pb-4">
                  <button className="flex items-center justify-between w-full text-left">
                    <span className="font-semibold text-white">High School</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">12 Episodes</span>
                      <ChevronDown size={16} />
                    </div>
                  </button>
                  {/* Mobile video thumbnails would go here */}
                </div>
                
                <div className="border-b border-gray-700 pb-4">
                  <button className="flex items-center justify-between w-full text-left">
                    <span className="font-semibold text-white">Collegiate</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">16 Videos</span>
                      <ChevronDown size={16} />
                    </div>
                  </button>
                </div>

                <div className="border-b border-gray-700 pb-4">
                  <button className="flex items-center justify-between w-full text-left">
                    <span className="font-semibold text-white">Professional</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">0 Videos</span>
                      <ChevronDown size={16} />
                    </div>
                  </button>
                </div>
              </div>

              {/* Share and Tags */}
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-white mb-3">Share</h3>
                  <div className="flex gap-3">
                    <button className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                      </svg>
                    </button>
                    <button className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </button>
                    <button className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {["#action", "#adventure", "#survival", "#wars", "#1980", "#history", "#documentary"].map((tag) => (
                      <button
                        key={tag}
                        className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="p-4">
              <VideoComments />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
