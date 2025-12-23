// src/components/ImageUploader.jsx
import React, { useRef } from 'react'
import { Icons } from './Icons'
import { SkuImage } from './SkuImage'

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

    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 150; 
        
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

        // Fill background with white (fixes transparent PNGs turning black)
        ctx.fillStyle = '#FFFFFF'; 
        ctx.fillRect(0, 0, width, height);
        
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            onUpload(imageKey, blob);
          }
        }, 'image/jpeg', 0.8);
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
            <div className="w-full h-full">
              <SkuImage
                data={currentImage}
                alt="Uploaded"
                className={`w-full h-full object-${objectFit} object-center`}
              />
            </div>
            {/* UPDATED OVERLAY CSS: Uses opacity-0 to ensure it's invisible by default */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <span className="text-white scale-75">
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