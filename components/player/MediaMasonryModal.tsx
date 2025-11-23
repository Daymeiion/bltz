"use client";

import React, { useState } from "react";
import { Dialog, DialogPortal } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import PhotoAlbum from "react-photo-album";
import { X } from "lucide-react";
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/shadcn-io/dock";

interface MediaItem {
  id: string;
  url: string;
  title?: string;
  credits?: string;
  width?: number;
  height?: number;
}

interface MediaMasonryModalProps {
  mediaItems: MediaItem[];
  children: React.ReactNode;
}

export default function MediaMasonryModal({ 
  mediaItems,
  children 
}: MediaMasonryModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  // Convert media items to photo album format
  const photos = mediaItems.map((item) => ({
    src: item.url,
    width: item.width || 800,
    height: item.height || 600,
    title: item.title,
    description: item.credits,
  }));

  const handleDockItemClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  // Sort media items with newest first (reverse order)
  const sortedMediaItems = [...mediaItems].reverse();

  return (
    <>
      <div onClick={handleClick} style={{ display: 'contents' }}>
        {children}
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          {/* Dark Overlay */}
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          
          {/* Modal Content */}
          <DialogPrimitive.Content className="fixed inset-0 z-50 bg-transparent border-0 p-0 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
            {/* Close Button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 z-[60] p-3 rounded-full bg-white/[0.03] text-white hover:bg-gray-700/70 transition-all duration-300 ease-in-out overflow-hidden group"
            >
              <X size={24} className="relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out rounded-full"></div>
            </button>

            {/* Main Content Container */}
            <div className="absolute inset-0 p-8 overflow-hidden">
              <div className="w-full h-full flex gap-6">
                {/* Vertical Dock */}
                <div className="w-20 flex-shrink-0 flex justify-center z-50 relative mt-8">
                  <div className="h-full flex items-center">
                    <div className="transform -rotate-90">
                      <Dock
                        className="bg-black/20 border border-white/10 rounded-md"
                        magnification={80}
                        distance={120}
                      >
                        {sortedMediaItems.map((item, index) => (
                          <div key={item.id} onClick={() => handleDockItemClick(index)} style={{ cursor: 'pointer' }}>
                            <DockItem>
                              <DockIcon>
                                <img
                                  src={item.url}
                                  alt={item.title || `Media ${index + 1}`}
                                  className="w-full h-full object-cover rounded-lg transform rotate-90"
                                />
                              </DockIcon>
                              <DockLabel>
                                {new Date().toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </DockLabel>
                            </DockItem>
                          </div>
                        ))}
                      </Dock>
                    </div>
                  </div>
                </div>

                {/* Masonry Grid */}
                <div className="flex-1 overflow-auto">
                  <h2 className="text-3xl font-bebas tracking-widest text-white mb-6 text-center">
                    Media Gallery
                  </h2>
                  
                  <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                    {photos.map((photo, index) => (
                      <div
                        key={index}
                        className="group relative overflow-hidden rounded-md cursor-pointer hover:opacity-90 transition-all duration-300 ease-out break-inside-avoid mb-4"
                        onClick={() => console.log(`Clicked image ${index}`)}
                      >
                        <img
                          src={photo.src}
                          alt={photo.title || `Media ${index + 1}`}
                          className="w-full h-auto object-contain rounded-md transition-transform duration-300 ease-out group-hover:scale-105"
                        />
                        {/* Subtle overlay on hover */}
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out rounded-md" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}

