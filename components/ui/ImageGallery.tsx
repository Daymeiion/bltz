"use client";

import { useState } from "react";
import { X, ZoomIn, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageAttachment {
  id: string;
  file_name: string;
  file_path: string;
  thumbnail_path?: string;
  file_size: number;
  file_type: string;
  width?: number;
  height?: number;
}

interface ImageGalleryProps {
  attachments: ImageAttachment[];
  className?: string;
}

export function ImageGallery({ attachments, className = "" }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ImageAttachment | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const imageAttachments = attachments.filter(att => att.file_type === 'image');

  if (imageAttachments.length === 0) return null;

  const openLightbox = (image: ImageAttachment, index: number) => {
    setSelectedImage(image);
    setCurrentIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    const nextIndex = (currentIndex + 1) % imageAttachments.length;
    setCurrentIndex(nextIndex);
    setSelectedImage(imageAttachments[nextIndex]);
  };

  const prevImage = () => {
    const prevIndex = currentIndex === 0 ? imageAttachments.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    setSelectedImage(imageAttachments[prevIndex]);
  };

  const downloadImage = (image: ImageAttachment) => {
    const link = document.createElement('a');
    link.href = image.file_path;
    link.download = image.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className={`grid grid-cols-2 gap-2 ${className}`}>
        {imageAttachments.map((image, index) => (
          <div
            key={image.id}
            className="relative group cursor-pointer"
            onClick={() => openLightbox(image, index)}
          >
            <img
              src={image.thumbnail_path || image.file_path}
              alt={image.file_name}
              className="w-full h-24 object-cover rounded-lg hover:opacity-90 transition-opacity"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
              {(image.file_size / 1024 / 1024).toFixed(1)}MB
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            {/* Close button */}
            <Button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Download button */}
            <Button
              onClick={() => downloadImage(selectedImage)}
              className="absolute top-4 right-16 z-10 bg-black/50 hover:bg-black/70 text-white"
              size="sm"
            >
              <Download className="h-4 w-4" />
            </Button>

            {/* Navigation buttons */}
            {imageAttachments.length > 1 && (
              <>
                <Button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
                  size="sm"
                >
                  ‹
                </Button>
                <Button
                  onClick={nextImage}
                  className="absolute right-16 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
                  size="sm"
                >
                  ›
                </Button>
              </>
            )}

            {/* Main image */}
            <img
              src={selectedImage.file_path}
              alt={selectedImage.file_name}
              className="w-full h-full object-contain rounded-lg"
            />

            {/* Image info */}
            <div className="absolute bottom-4 left-4 bg-black/50 text-white text-sm px-3 py-2 rounded">
              <div className="font-medium">{selectedImage.file_name}</div>
              <div className="text-xs text-gray-300">
                {selectedImage.width && selectedImage.height && 
                  `${selectedImage.width} × ${selectedImage.height}`}
                {selectedImage.width && selectedImage.height && ' • '}
                {(selectedImage.file_size / 1024 / 1024).toFixed(1)}MB
              </div>
            </div>

            {/* Image counter */}
            {imageAttachments.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black/50 text-white text-sm px-3 py-2 rounded">
                {currentIndex + 1} / {imageAttachments.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
