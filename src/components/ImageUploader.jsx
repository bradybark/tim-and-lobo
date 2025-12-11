// src/components/ImageUploader.jsx
import React, { useRef } from 'react'
import { Icons } from './Icons'

export function ImageUploader({
  imageKey,
  currentImage,
  onUpload,
  className = '',
  placeholder,
  objectFit = 'cover',
}) {
  const fileInputRef = useRef(null)

  const handleClick = (e) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Ensure it's an image
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300; // Limit width to 300px
        
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 0.7 quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        onUpload(imageKey, compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const containerClasses = `cursor-pointer overflow-hidden relative group flex items-center justify-center ${className}`
  const emptyStateClasses = currentImage
    ? ''
    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'

  return (
    <div className="relative inline-block w-full h-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div
        onClick={handleClick}
        className={`${containerClasses} ${emptyStateClasses}`}
        title="Upload image"
      >
        {currentImage ? (
          <>
            <img
              src={currentImage}
              alt="Uploaded"
              className={`w-full h-full object-${objectFit} object-center`}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
              <span className="text-white opacity-0 group-hover:opacity-100 scale-75">
                <Icons.Camera className="w-6 h-6" />
              </span>
            </div>
          </>
        ) : (
          placeholder || (
            <span className="text-gray-400">
              <Icons.Upload className="w-6 h-6" />
            </span>
          )
        )}
      </div>
    </div>
  )
}