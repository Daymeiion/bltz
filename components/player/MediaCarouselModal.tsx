"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Carousel from "@/components/ui/carousel";
import { X } from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  title?: string;
  description?: string;
  credits?: string;
}

interface MediaCarouselModalProps {
  mediaItems: MediaItem[];
  initialIndex?: number;
  children: React.ReactNode;
}

export default function MediaCarouselModal({ 
  mediaItems, 
  initialIndex = 0,
  children 
}: MediaCarouselModalProps) {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Convert media items to carousel slides format
  const slides = mediaItems.map((item) => ({
    src: item.url,
    title: item.title || "",
    button: "View",
    credits: item.credits || "",
  }));

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      {/* Using display: contents to be transparent to grid layout */}
      <div style={{ display: 'contents' }} onClick={handleClick}>
        {children}
      </div>
      
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogPortal>
          {/* Custom Darker Overlay */}
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          
          {/* Modal Content */}
          <DialogPrimitive.Content className="fixed inset-0 z-50 bg-transparent border-0 p-0 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
            {/* Gradient Overlays - Fade to center effect */}
            <div className="absolute inset-0 pointer-events-none z-40">
              {/* Left gradient */}
              <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-gradient-to-r from-black to-transparent"></div>
              {/* Right gradient */}
              <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-gradient-to-l from-black to-transparent"></div>
              {/* Top gradient */}
              <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-black to-transparent"></div>
              {/* Bottom gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black to-transparent"></div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 z-[60] p-3 rounded-full bg-white/[0.03] text-white hover:bg-gray-700/70 transition-all duration-300 ease-in-out overflow-hidden group"
            >
              <X size={24} className="relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out rounded-full"></div>
            </button>

            {/* Carousel Container - Vertically and Horizontally Centered */}
            <div className="absolute inset-0 flex items-center justify-center py-16 px-8 z-45">
              <div className="w-full max-w-6xl h-full flex items-center justify-center">
                <Carousel slides={slides} />
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}

