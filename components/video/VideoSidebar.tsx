"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Play } from "lucide-react";
import Image from "next/image";

interface Video {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  publishedDate: string;
}

interface Category {
  name: string;
  videos: Video[];
  isExpanded: boolean;
}

const mockCategories: Category[] = [
  {
    name: "High School",
    videos: [
      { id: "1", title: "THDST-S1EP1", duration: "36min", thumbnail: "/images/Awards/video-thumb.png", publishedDate: "Published on June 29, 2020" },
      { id: "2", title: "THDST-S1EP2", duration: "42min", thumbnail: "/images/Awards/video-thumb.png", publishedDate: "Published on July 6, 2020" },
      { id: "3", title: "THDST-S1EP3", duration: "38min", thumbnail: "/images/Awards/video-thumb.png", publishedDate: "Published on July 13, 2020" },
      { id: "4", title: "THDST-S1EP4", duration: "45min", thumbnail: "/images/Awards/video-thumb.png", publishedDate: "Published on July 20, 2020" },
      { id: "5", title: "THDST-S1EP5", duration: "41min", thumbnail: "/images/Awards/video-thumb.png", publishedDate: "Published on July 27, 2020" },
      { id: "6", title: "THDST-S1EP6", duration: "39min", thumbnail: "/images/Awards/video-thumb.png", publishedDate: "Published on August 3, 2020" },
      { id: "7", title: "THDST-S1EP7", duration: "43min", thumbnail: "/images/Awards/video-thumb.png", publishedDate: "Published on August 10, 2020" },
      { id: "8", title: "THDST-S1EP8", duration: "37min", thumbnail: "/images/Awards/video-thumb.png", publishedDate: "Published on August 17, 2020" },
    ],
    isExpanded: true,
  },
  {
    name: "Collegiate",
    videos: [
      { id: "9", title: "College Game 1", duration: "60min", thumbnail: "/images/Awards/video-thumb.png", publishedDate: "Published on August 24, 2020" },
      { id: "10", title: "College Game 2", duration: "58min", thumbnail: "/images/Awards/video-thumb.png", publishedDate: "Published on August 31, 2020" },
    ],
    isExpanded: false,
  },
  {
    name: "Professional",
    videos: [],
    isExpanded: false,
  },
];

export default function VideoSidebar() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);

  const toggleCategory = (categoryName: string) => {
    setCategories(prev => 
      prev.map(cat => 
        cat.name === categoryName 
          ? { ...cat, isExpanded: !cat.isExpanded }
          : cat
      )
    );
  };

  const getVideoCount = (category: Category) => {
    return category.videos.length;
  };

  return (
    <div className="w-full max-w-lg space-y-4">
      {/* Video Categories */}
      <div className="bg-gray-800/30 rounded-lg p-0">
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.name} className="bg-gray-800/40 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(category.name)}
                className="flex items-center justify-between w-full text-left hover:text-blue-400 transition-colors p-4"
              >
                <span className="font-semibold text-white">{category.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    {getVideoCount(category)} {getVideoCount(category) === 1 ? "Episode" : getVideoCount(category) === 0 ? "Videos" : "Episodes"}
                  </span>
                  {category.isExpanded ? <ChevronUp size={16} className="text-accent" /> : <ChevronDown size={16} className="text-accent" />}
                </div>
              </button>

              {category.isExpanded && category.videos.length > 0 && (
                <div className="px-1 pb-4">
                  <div className="max-h-80 overflow-y-auto scrollbar-thin text-accent">
                    <div className="space-y-2">
                      {category.videos.map((video) => (
                        <div key={video.id} className="flex gap-3 hover:bg-gray-700/50 rounded-lg p-1 transition-colors cursor-pointer">
                          <div className="relative w-16 h-10 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                            <Play size={12} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white truncate">{video.title}</h4>
                            <p className="text-xs text-gray-400">{video.duration}</p>
                            <p className="text-xs text-gray-500">{video.publishedDate}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Share Container */}
      <div className="bg-gray-800/40 rounded-lg p-4">
        <h3 className="font-semibold text-white mb-3">Share</h3>
        <div className="flex gap-3">
          <button className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </button>
          <button className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center hover:bg-sky-600 transition-colors">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
            </svg>
          </button>
          <button className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center hover:bg-blue-800 transition-colors">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </button>
          <button className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center hover:from-pink-600 hover:to-purple-700 transition-colors">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
            </svg>
          </button>
          <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
          <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tags */}
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
  );
}
